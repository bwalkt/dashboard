// Utility functions for gRPC processing

import {
  CHALLENGE_ANSWER_HEADER,
  CHALLENGE_ID_HEADER,
  CHALLENGE_PARAMS_HEADER,
  CHALLENGE_QUESTION_HEADER,
} from '../grid/challenge.js'
import { HttpMethod } from '../types'

export const VALIDATION_HEADER = 'x-test-eval'
export const PROXY_TARGET_HEADER = 'x-proxy-target'
export { CHALLENGE_ANSWER_HEADER, CHALLENGE_ID_HEADER, CHALLENGE_PARAMS_HEADER }
export const CHALLENGE_HEADER = CHALLENGE_QUESTION_HEADER
export const CHALLENGER_HEADERS = [
  CHALLENGE_ID_HEADER,
  CHALLENGE_HEADER,
  CHALLENGE_ANSWER_HEADER,
  CHALLENGE_PARAMS_HEADER,
]
/**
 * Extract token from cookie header
 */
export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
export const HTTP_STATUS = ['200', '201', '204', '400', '401', '403', '404', '500', '502', '503', '504']
export const HttpStatusText = {
  '200': 'OK',
  '201': 'Created',
  '204': 'No Content',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '500': 'Internal Server Error',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
} as const
export type HttpStatusCode = keyof typeof HttpStatusText
export const HTTP_STATUS_CODES: HttpStatusCode[] = Object.keys(HttpStatusText) as HttpStatusCode[]
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any
  baseUrl?: string
  skipRefresh?: boolean // Skip automatic token refresh for this request
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: Response,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getChallengeSecret(): string {
  const secret =
    typeof window !== 'undefined'
      ? ((import.meta as any).env?.VITE_CHALLENGE_SECRET ?? 'pzero')
      : (process.env.VITE_CHALLENGE_SECRET ?? 'pzero')
  return secret
}

/**
 * Convert HeadersInit to a plain object
 */
export function headersToObject(headers: HeadersInit): Record<string, string> {
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {}
    headers.forEach((value, key) => {
      obj[key] = value
    })
    return obj
  }
  return (headers as Record<string, string>) || {}
}
/**
 * Serialize request body based on its type
 */
export function serializeBody(
  body: any,
  headers: Record<string, string>,
): { body: any; headers: Record<string, string> } {
  if (body === undefined) {
    const updatedHeaders = { ...headers }
    delete updatedHeaders['Content-Type']
    return { body: undefined, headers: updatedHeaders }
  }

  const updatedHeaders = { ...headers }

  if (body instanceof FormData) {
    // Don't set Content-Type for FormData, let the browser set it with boundary
    delete updatedHeaders['Content-Type']
    return { body, headers: updatedHeaders }
  }

  if (typeof body === 'object') {
    // Add Content-Type header for JSON body
    updatedHeaders['Content-Type'] = 'application/json'
    // JSON.stringify for direct requests
    return { body: JSON.stringify(body), headers: updatedHeaders }
  }

  return { body, headers: updatedHeaders }
}

/**
 * Extract error message from a response, falling back to status text
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  let errorMessage = `Request failed: ${response.status} ${response.statusText}`
  try {
    const errorData = await response.json()
    errorMessage = errorData.message || errorData.error || errorMessage
  } catch {
    // If we can't parse the error response, use the default message
  }
  return errorMessage
}
export function extractTokenFromCookie(cookieHeader: string): string | null {
  if (!cookieHeader) return null

  const cookies: { [key: string]: string } = {}
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      try {
        cookies[name] = decodeURIComponent(value)
      } catch {
        cookies[name] = value
      }
    }
  })

  // Check for JWT tokens in cookies
  return cookies.accessToken || cookies.refreshToken || null
}

/**
 * Check if a path is considered public (doesn't require authentication)
 */
export function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/health',
    '/metrics',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/auth/register',
    '/auth/login',
    '/auth/logout',
    '/auth/refresh',
  ]

  const publicPrefixes = ['/static/', '/assets/', '/api/public/', '/_next/']

  // Exact matches
  if (publicPaths.includes(path)) {
    return true
  }

  // Prefix matches
  for (const prefix of publicPrefixes) {
    if (path.startsWith(prefix)) {
      return true
    }
  }

  return false
}

/**
 * Create authentication headers for successful validation
 */
export function createAuthHeaders(
  userId: string,
  email: string,
): Array<{ header: string; value: string; append: boolean }> {
  const clientId = `user_${userId}_${Date.now()}`

  return [
    {
      header: 'x-auth-validated',
      value: 'true',
      append: false,
    },
    {
      header: 'x-auth-user-id',
      value: userId.toString(),
      append: false,
    },
    {
      header: 'x-auth-user-email',
      value: email,
      append: false,
    },
    {
      header: 'x-client-id',
      value: clientId,
      append: false,
    },
    {
      header: 'x-validation-method',
      value: 'centrifuge-grpc',
      append: false,
    },
    {
      header: 'x-validation-timestamp',
      value: Date.now().toString(),
      append: false,
    },
  ]
}

/**
 * Create response tracking headers
 */
export function createResponseTrackingHeaders(): Array<{ header: string; value: string; append: boolean }> {
  return [
    {
      header: 'x-server-processed-by',
      value: 'centrifuge-grpc',
      append: false,
    },
    {
      header: 'x-processing-time',
      value: Date.now().toString(),
      append: false,
    },
  ]
}

export function getHeaderValue(item: Record<string, any>, key: string): string | undefined {
  const value = item[key]
  return value !== undefined && value !== null && value.trim() !== '' ? value : undefined
}

export const isCorrectAnswer = (item: Record<string, any>, challengeAnswer: string | undefined): boolean => {
  const value = getHeaderValue(item, 'req_headers.x-correct-answer')
  return value !== undefined && value === challengeAnswer
}

export const extractHeaders = (item: any, keys: string[], prefix: string): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const key of keys) {
    const value = getHeaderValue(item, `${prefix}.${key}`)
    console.log(`Extracting header ${prefix}.${key}:`, value)
    if (value) {
      result[key] = value
    }
  }
  return result
}
