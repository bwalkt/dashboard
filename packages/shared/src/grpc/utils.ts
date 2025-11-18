// Utility functions for gRPC processing

/**
 * Extract token from cookie header
 */
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
  userId: number,
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
