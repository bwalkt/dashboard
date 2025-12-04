export { stores } from '../stores'
export { getLocalIPAddress, getNetworkInfo, subscribeToNetworkChanges } from '../utils/network'
export { endpointStore, getServerStatus, getServerURL, getWebSocketURL } from './server'

import type { Method, URLHeader } from '@pzero/shared/pzero'
// Using native fetch with timeout handling

export type FetchOptions = {
  method: Method
  headers?: URLHeader[]
  body?: unknown
  endPoint?: string
  timeout?: number // in milliseconds
  allowStreaming?: boolean
}
export type ServiceClassOptions = {
  baseURL: string
  defaultHeaders?: URLHeader[]
  methods?: Record<string, FetchOptions>
  allowStreaming?: boolean
}

export class ServiceError extends Error {
  code: number
  constructor(message: string, code: number) {
    super(message)
    this.code = code
  }
}

export class ServiceTimeoutError extends ServiceError {
  constructor(message: string = 'Service request timed out') {
    super(message, 408)
  }
}

export class ServiceNetworkError extends ServiceError {
  constructor(message: string = 'Network error occurred') {
    super(message, 503)
  }
}

export class ServiceResponseError extends ServiceError {
  constructor(message: string = 'Service responded with an error', code: number = 500) {
    super(message, code)
  }
}

export class ServiceClass {
  baseURL: string
  defaultHeaders: URLHeader[]
  methods?: Record<Method, FetchOptions>
  allowStreaming: boolean

  constructor({ baseURL, defaultHeaders = [], methods, allowStreaming = false }: ServiceClassOptions) {
    this.baseURL = baseURL
    this.defaultHeaders = defaultHeaders
    this.methods = methods
    this.allowStreaming = allowStreaming
  }

  async request(options: {
    method: Method
    headers?: URLHeader[]
    body?: unknown
    timeout?: number
    endPoint?: string
  }): Promise<unknown> {
    const { method, headers = [], body, timeout = 5000, endPoint = '' } = options

    if (this.methods && !Object.hasOwn(this.methods, method)) {
      throw new Error(`Method ${method} not allowed. Allowed methods: ${Object.keys(this.methods).join(', ')}`)
    }

    const allHeaders = [...this.defaultHeaders, ...headers].reduce(
      (acc, header) => {
        acc[header.key] = header.value
        return acc
      },
      {} as Record<string, string>,
    )

    // Add content-type if not present and body exists
    if (body && !allHeaders['Content-Type']) {
      allHeaders['Content-Type'] = 'application/json'
    }

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(`${this.baseURL}${endPoint}`, {
        method: method,
        headers: allHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new ServiceResponseError(`Error: ${response.statusText}`, response.status)
      }

      const responseBody = await response.json()
      return responseBody
    } catch (error: unknown) {
      clearTimeout(timeoutId)

      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        throw new ServiceTimeoutError()
      } else if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        (error.message === 'Network request failed' || ('name' in error && error.name === 'NetworkError'))
      ) {
        throw new ServiceNetworkError(
          typeof error === 'object' && 'message' in error ? String(error.message) : 'Network error',
        )
      } else if (error instanceof ServiceError) {
        throw error
      } else {
        throw new ServiceError(
          error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error occurred',
          500,
        )
      }
    }
  }
}
