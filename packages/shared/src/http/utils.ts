// Utility functions for gRPC processing

import { HttpMethod } from '../types'

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
  if (!!!value) {
    return false
  }
  return value === challengeAnswer
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
