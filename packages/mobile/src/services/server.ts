//TODO 1. add threads for each endpoint, 2. keep track of thread status. 3. add

import { SERVER_HOST, SERVER_PORT } from '@env'
import { type Endpoint, type EndpointStatus, endpointStatuses } from '@pzero/shared/pzero'
import { uuid } from '@pzero/shared/uuid'
import { Buffer } from 'buffer'
import crypto from 'react-native-quick-crypto'
import TcpSocket from 'react-native-tcp-socket'
import { HistoryStore, Keys } from '../stores/history'
import { ZStorage } from '../stores/store'
import { getLocalIPAddress } from '../utils/network'

const DEFAULT_PORT = Number.parseInt(SERVER_PORT || '8090', 10)
export const ServerURL = `${SERVER_HOST || 'http://localhost'}:${SERVER_PORT || DEFAULT_PORT}`
/**
 * WEBSOCKET_MAGIC_STRING is a constant defined in RFC 6455 (WebSocket Protocol Specification).
 * This GUID is used during the WebSocket handshake to generate the Sec-WebSocket-Accept header.
 *
 * How it works:
 * 1. Client sends Sec-WebSocket-Key header (base64 encoded random 16-byte value)
 * 2. Server concatenates the key with this magic string
 * 3. Server computes SHA-1 hash of the concatenated string
 * 4. Server base64 encodes the hash and sends it back as Sec-WebSocket-Accept
 *
 * This ensures the server understands the WebSocket protocol and prevents
 * HTTP servers from accidentally accepting WebSocket connections.
 */
const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

interface ServerConfig {
  port: number
  host?: string
}

interface HTTPRequest {
  method: string
  path: string
  headers: Record<string, string>
  body: string
  httpVersion: string
}

interface WebSocketFrame {
  fin: boolean
  opcode: number
  mask: boolean
  payload: Buffer
  bytesConsumed: number
}

export const STORE = 'EndpointsStore'

class HTTPServer extends ZStorage {
  private server: any = null
  private config: ServerConfig
  private connections: Set<any> = new Set()
  private isRunning = false
  endpoints: Map<string, Endpoint> = new Map()

  constructor(config?: Partial<ServerConfig>) {
    super(STORE)

    const storedEndpoints = this.getAll()
    if (storedEndpoints !== undefined && storedEndpoints !== null) {
      this.endpoints = new Map(Object.entries(storedEndpoints))
    }
    this.config = {
      port: config?.port || DEFAULT_PORT,
      host: config?.host || '0.0.0.0',
    }
  }
  async addEndpoint(endpoint: Endpoint) {
    const id = uuid()
    if (this.endpoints.has(id)) {
      throw new Error(`Endpoint with id ${id} already exists`)
    }
    const newEndpoint = {
      ...endpoint,
      id,
      name: endpoint.name || id,
      dateAdded: Date.now(),
      status: endpoint.status || endpointStatuses.unverified,
    }
    this.endpoints.set(id, newEndpoint)
    this.setItem({ key: id, data: newEndpoint })
    await this.maybeToggleServer()
    console.log(`Endpoint ${id} added with verified status ${newEndpoint.status}`)
    return newEndpoint
  }
  async updateEndpoint(id: string, updates: Partial<Endpoint>) {
    const endpoint = this.endpoints.get(id)
    if (!endpoint) {
      throw new Error(`Endpoint with id ${id} does not exist`)
    }
    if (endpoint.id !== updates.id) {
      throw new Error('Endpoint id cannot be changed')
    }
    const { status, data } = HistoryStore.putHistory({ id, key: Keys.endpoints, original: endpoint, updates })
    if (!status) {
      console.log('No Op - no change')
    }
    const parsedEndpoint: Endpoint = typeof data === 'string' ? JSON.parse(data) : data
    this.setItem({ key: id, data: parsedEndpoint })
    this.endpoints.set(id, parsedEndpoint)
    if (endpoint.status !== parsedEndpoint.status) {
      await this.maybeToggleServer()
      console.log(`Endpoint ${id} verified status changed to ${parsedEndpoint.status}`)
    }
    return parsedEndpoint
  }
  getEndpoint(id: string) {
    return this.endpoints.get(id)
  }
  getAllEndpoints() {
    return Array.from(this.endpoints.values())
  }
  getServableEndpoints() {
    return Array.from(this.endpoints.values()).filter(
      e => !e.dateRevoked && (e.status === endpointStatuses.active || e.status === endpointStatuses.verified),
    )
  }
  getActiveEndpoints() {
    return Array.from(this.endpoints.values()).filter(
      endpoint =>
        !endpoint.dateRevoked &&
        (endpoint.status === endpointStatuses.verified || endpoint.status === endpointStatuses.active),
    )
  }
  async maybeToggleServer() {
    const canServe = this.getServableEndpoints().length > 0
    if (canServe) {
      try {
        await this.start()
      } catch (error) {
        console.error('Failed to start server:', error)
      }
    } else {
      await this.stop()
    }
  }
  getRevokedEndpoints() {
    return Array.from(this.endpoints.values()).filter(endpoint => endpoint.dateRevoked)
  }
  async removeEndpoint(id: string) {
    this.endpoints.delete(id)
    this.removeItem(id)
    await this.maybeToggleServer()
  }
  getEndpointStatus(id: string): EndpointStatus | null {
    const endpoint = this.endpoints.get(id)
    if (!endpoint) {
      return null
    }
    if (endpoint.dateRevoked) {
      return endpointStatuses.revoked
    }
    return endpoint.status
  }
  /**
   * Start the HTTP/WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        console.log('Server already running')
        resolve()
        return
      }

      try {
        this.server = TcpSocket.createServer((socket: any) => {
          console.log('Client connected:', socket.address())
          this.connections.add(socket)

          let buffer = Buffer.alloc(0)
          let isWebSocket = false

          socket.on('data', (data: Buffer) => {
            buffer = Buffer.concat([buffer, data])

            if (!isWebSocket) {
              // Check if we have a complete HTTP request
              const headerEnd = buffer.indexOf('\r\n\r\n')
              if (headerEnd !== -1) {
                const request = this.parseHTTPRequest(Buffer.from(buffer.subarray(0, headerEnd + 4)))

                // Check for WebSocket upgrade
                if (this.isWebSocketUpgrade(request)) {
                  isWebSocket = true
                  this.handleWebSocketUpgrade(socket, request)
                  buffer = Buffer.from(buffer.subarray(headerEnd + 4))
                } else {
                  this.handleHTTPRequest(socket, request)
                  buffer = Buffer.alloc(0)
                }
              }
            } else {
              // Parse as many complete frames as available
              while (buffer.length > 0) {
                const bytesConsumed = this.handleWebSocketFrame(socket, buffer)
                if (bytesConsumed === 0) break // Incomplete frame, wait for more data
                buffer = Buffer.from(buffer.subarray(bytesConsumed))
              }
            }
          })

          socket.on('error', (error: Error) => {
            console.error('Socket error:', error)
            this.connections.delete(socket)
          })

          socket.on('close', () => {
            console.log('Client disconnected')
            this.connections.delete(socket)
          })
        })

        this.server.listen({ port: this.config.port, host: this.config.host }, () => {
          this.isRunning = true
          console.log(`Server listening on ${this.config.host}:${this.config.port}`)
          resolve()
        })

        this.server.on('error', (error: Error) => {
          console.error('Server error:', error)
          reject(error)
        })
      } catch (error) {
        console.error('Failed to start server:', error)
        reject(error)
      }
    })
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise(resolve => {
      if (!this.isRunning) {
        resolve()
        return
      }

      // Close all connections
      for (const connection of this.connections) {
        connection.destroy()
      }
      this.connections.clear()

      if (this.server) {
        this.server.close(() => {
          this.isRunning = false
          console.log('Server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Parse HTTP request from buffer
   */
  private parseHTTPRequest(buffer: Buffer): HTTPRequest {
    const requestString = buffer.toString('utf8')
    const lines = requestString.split('\r\n')
    const [method, path, httpVersion] = lines[0].split(' ')

    const headers: Record<string, string> = {}
    let i = 1
    for (; i < lines.length; i++) {
      const line = lines[i]
      if (line === '') break
      const [key, ...valueParts] = line.split(': ')
      headers[key.toLowerCase()] = valueParts.join(': ')
    }

    const body = lines.slice(i + 1).join('\r\n')

    return { method, path, headers, body, httpVersion }
  }

  /**
   * Check if request is WebSocket upgrade
   */
  private isWebSocketUpgrade(request: HTTPRequest): boolean {
    return (
      request.headers['upgrade']?.toLowerCase() === 'websocket' &&
      request.headers['connection']?.toLowerCase().includes('upgrade')
    )
  }

  /**
   * Handle WebSocket upgrade
   */
  private handleWebSocketUpgrade(socket: any, request: HTTPRequest): void {
    const key = request.headers['sec-websocket-key']
    if (!key) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
      return
    }

    // Generate accept key using RN-compatible crypto
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + WEBSOCKET_MAGIC_STRING)
      .digest('base64')

    // Send upgrade response
    const response = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n',
    ].join('\r\n')

    socket.write(response)
    console.log('WebSocket connection established')
  }

  /**
   * Handle WebSocket frame
   * @returns Number of bytes consumed from buffer
   */
  private handleWebSocketFrame(socket: any, buffer: Buffer): number {
    if (buffer.length < 2) return 0

    const frame = this.parseWebSocketFrame(buffer)
    if (!frame) return 0

    // Handle different opcodes
    switch (frame.opcode) {
      case 0x1: // Text frame
        console.log('Received text:', frame.payload.toString('utf8'))
        // Echo back for now
        this.sendWebSocketFrame(socket, frame.payload.toString('utf8'))
        break
      case 0x8: // Close frame
        socket.end()
        break
      case 0x9: // Ping
        this.sendWebSocketPong(socket, frame.payload)
        break
    }

    return frame.bytesConsumed
  }

  /**
   * Parse WebSocket frame
   * @returns WebSocketFrame with bytesConsumed, or null if incomplete
   */
  private parseWebSocketFrame(buffer: Buffer): WebSocketFrame | null {
    if (buffer.length < 2) return null

    const fin = (buffer[0] & 0x80) !== 0
    const opcode = buffer[0] & 0x0f
    const mask = (buffer[1] & 0x80) !== 0
    let payloadLength = buffer[1] & 0x7f

    let offset = 2

    if (payloadLength === 126) {
      if (buffer.length < 4) return null
      payloadLength = buffer.readUInt16BE(2)
      offset = 4
    } else if (payloadLength === 127) {
      if (buffer.length < 10) return null
      // For simplicity, we'll use readUInt32BE for the lower 32 bits
      payloadLength = buffer.readUInt32BE(6)
      offset = 10
    }

    if (mask) {
      if (buffer.length < offset + 4 + payloadLength) return null
      const maskingKey = Buffer.from(buffer.subarray(offset, offset + 4))
      offset += 4

      const payload = Buffer.alloc(payloadLength)
      for (let i = 0; i < payloadLength; i++) {
        payload[i] = buffer[offset + i] ^ maskingKey[i % 4]
      }

      const bytesConsumed = offset + payloadLength
      return { fin, opcode, mask, payload, bytesConsumed }
    }

    if (buffer.length < offset + payloadLength) return null
    const payload = Buffer.from(buffer.subarray(offset, offset + payloadLength))
    const bytesConsumed = offset + payloadLength

    return { fin, opcode, mask, payload, bytesConsumed }
  }

  /**
   * Send WebSocket frame
   */
  private sendWebSocketFrame(socket: any, message: string): void {
    const payload = Buffer.from(message, 'utf8')
    const payloadLength = payload.length
    let header: Buffer

    if (payloadLength <= 125) {
      header = Buffer.from([0x81, payloadLength])
    } else if (payloadLength <= 0xffff) {
      header = Buffer.alloc(4)
      header[0] = 0x81
      header[1] = 126
      header.writeUInt16BE(payloadLength, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x81
      header[1] = 127
      header.writeUInt32BE(0, 2) // High 32 bits (zero for payloads < 4GB)
      header.writeUInt32BE(payloadLength, 6) // Low 32 bits
    }

    socket.write(Buffer.concat([header, payload]))
  }

  /**
   * Send WebSocket pong
   */
  private sendWebSocketPong(socket: any, payload: Buffer): void {
    const payloadLength = payload.length
    let header: Buffer

    if (payloadLength <= 125) {
      header = Buffer.from([0x8a, payloadLength])
    } else if (payloadLength <= 0xffff) {
      header = Buffer.alloc(4)
      header[0] = 0x8a
      header[1] = 126
      header.writeUInt16BE(payloadLength, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x8a
      header[1] = 127
      header.writeUInt32BE(0, 2) // High 32 bits (zero for payloads < 4GB)
      header.writeUInt32BE(payloadLength, 6) // Low 32 bits
    }

    socket.write(Buffer.concat([header, payload]))
  }

  /**
   * Handle HTTP request
   */
  private handleHTTPRequest(socket: any, request: HTTPRequest): void {
    console.log(`${request.method} ${request.path}`)

    // Get verified endpoints
    const endpoints = this.getAllEndpoints().filter(e => e.status === endpointStatuses.verified)

    // Route request based on endpoints
    const endpoint = this.matchEndpoint(request.path, endpoints)

    if (endpoint) {
      this.proxyToEndpoint(socket, request, endpoint)
    } else {
      this.send404(socket)
    }
  }

  /**
   * Match request path to endpoint
   */
  private matchEndpoint(path: string, endpoints: Endpoint[]): Endpoint | null {
    // Simple matching - can be enhanced with path patterns
    for (const endpoint of endpoints) {
      if (endpoint.baseURI && path.startsWith(endpoint.baseURI)) {
        return endpoint
      }
    }
    return null
  }

  /**
   * Proxy request to endpoint
   */
  private proxyToEndpoint(socket: any, request: HTTPRequest, endpoint: Endpoint): void {
    // For now, return a simple response
    // TODO: Implement actual proxying logic
    const response = {
      status: 'success',
      endpoint: endpoint.name,
      path: request.path,
      method: request.method,
    }

    this.sendJSONResponse(socket, 200, response)
  }

  /**
   * Send JSON response
   */
  private sendJSONResponse(socket: any, statusCode: number, data: any): void {
    const body = JSON.stringify(data)
    const response = [
      `HTTP/1.1 ${statusCode} ${this.getStatusText(statusCode)}`,
      'Content-Type: application/json',
      `Content-Length: ${Buffer.byteLength(body)}`,
      'Connection: close',
      '\r\n',
      body,
    ].join('\r\n')

    socket.end(response)
  }

  /**
   * Send 404 response
   */
  private send404(socket: any): void {
    this.sendJSONResponse(socket, 404, { error: 'Not Found' })
  }

  /**
   * Get HTTP status text
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      404: 'Not Found',
      500: 'Internal Server Error',
    }
    return statusTexts[statusCode] || 'Unknown'
  }

  /**
   * Get server status
   */
  getStatus(): { isRunning: boolean; port: number; connections: number } {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      connections: this.connections.size,
    }
  }
}

// Singleton instance
export const endpointStore: HTTPServer = new HTTPServer()

/**
 * Start server if there are verified endpoints
 */

/**
 * Get server status
 */
export function getServerStatus() {
  return endpointStore?.getStatus() || { isRunning: false, port: 0, connections: 0 }
}

/**
 * Get the server URL that can be used by other devices on the network
 * Returns null if server is not running or IP cannot be determined
 */
export async function getServerURL(): Promise<string | null> {
  const status = getServerStatus()
  if (!status.isRunning) {
    return null
  }

  const ipAddress = await getLocalIPAddress()
  if (!ipAddress) {
    return null
  }

  return `http://${ipAddress}:${status.port}`
}

/**
 * Get WebSocket URL that can be used by other devices on the network
 * Returns null if server is not running or IP cannot be determined
 */
export async function getWebSocketURL(): Promise<string | null> {
  const status = getServerStatus()
  if (!status.isRunning) {
    return null
  }

  const ipAddress = await getLocalIPAddress()
  if (!ipAddress) {
    return null
  }

  return `ws://${ipAddress}:${status.port}`
}
