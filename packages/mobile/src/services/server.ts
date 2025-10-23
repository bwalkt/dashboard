import { SERVER_PORT } from '@env'
import type { Endpoint } from '@pzero/shared/pzero'
import { endpointStatuses } from '@pzero/shared/pzero'
import TcpSocket from 'react-native-tcp-socket'
import { EndpointsStore } from '../stores/endpoints'
import { getLocalIPAddress } from '../utils/network'

const DEFAULT_PORT = Number.parseInt(SERVER_PORT || '8070', 10)

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
}

class HTTPServer {
  private server: any = null
  private config: ServerConfig
  private connections: Set<any> = new Set()
  private isRunning = false

  constructor(config?: Partial<ServerConfig>) {
    this.config = {
      port: config?.port || DEFAULT_PORT,
      host: config?.host || '0.0.0.0',
    }
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
                const request = this.parseHTTPRequest(buffer.slice(0, headerEnd + 4))

                // Check for WebSocket upgrade
                if (this.isWebSocketUpgrade(request)) {
                  isWebSocket = true
                  this.handleWebSocketUpgrade(socket, request)
                  buffer = buffer.slice(headerEnd + 4)
                } else {
                  this.handleHTTPRequest(socket, request)
                  buffer = Buffer.alloc(0)
                }
              }
            } else {
              // Handle WebSocket frames
              this.handleWebSocketFrame(socket, buffer)
              buffer = Buffer.alloc(0)
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
    return new Promise((resolve) => {
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

    // Generate accept key
    const crypto = require('crypto')
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
   */
  private handleWebSocketFrame(socket: any, buffer: Buffer): void {
    if (buffer.length < 2) return

    const frame = this.parseWebSocketFrame(buffer)
    if (!frame) return

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
  }

  /**
   * Parse WebSocket frame
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
      const maskingKey = buffer.slice(offset, offset + 4)
      offset += 4

      const payload = Buffer.alloc(payloadLength)
      for (let i = 0; i < payloadLength; i++) {
        payload[i] = buffer[offset + i] ^ maskingKey[i % 4]
      }

      return { fin, opcode, mask, payload }
    }

    if (buffer.length < offset + payloadLength) return null
    const payload = buffer.slice(offset, offset + payloadLength)

    return { fin, opcode, mask, payload }
  }

  /**
   * Send WebSocket frame
   */
  private sendWebSocketFrame(socket: any, message: string): void {
    const payload = Buffer.from(message, 'utf8')
    const frame = Buffer.alloc(2 + payload.length)

    frame[0] = 0x81 // FIN + text frame
    frame[1] = payload.length

    payload.copy(frame, 2)
    socket.write(frame)
  }

  /**
   * Send WebSocket pong
   */
  private sendWebSocketPong(socket: any, payload: Buffer): void {
    const frame = Buffer.alloc(2 + payload.length)
    frame[0] = 0x8a // FIN + pong frame
    frame[1] = payload.length
    payload.copy(frame, 2)
    socket.write(frame)
  }

  /**
   * Handle HTTP request
   */
  private handleHTTPRequest(socket: any, request: HTTPRequest): void {
    console.log(`${request.method} ${request.path}`)

    // Get verified endpoints
    const endpoints = EndpointsStore.getAllEndpoints().filter(
      (e) => e.status === endpointStatuses.verified
    )

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
let serverInstance: HTTPServer | null = null

/**
 * Start server if there are verified endpoints
 */
export async function startServer(): Promise<void> {
  if (!serverInstance) {
    serverInstance = new HTTPServer()
    await serverInstance.start()
  }
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  if (serverInstance) {
    await serverInstance.stop()
    serverInstance = null
  }
}

/**
 * Get server status
 */
export function getServerStatus() {
  return serverInstance?.getStatus() || { isRunning: false, port: 0, connections: 0 }
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

export { HTTPServer }
