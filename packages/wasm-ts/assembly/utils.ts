import { FilterHeadersStatusValues, send_local_response } from '@solo-io/proxy-runtime'

// Helper function to sanitize path by removing query parameters
export function sanitizePath(path: string | null): string | null {
  if (path == null) {
    return null
  }
  // Split on '?' and take the first part to remove query parameters
  // At this point, path is guaranteed to be non-null
  const pathStr = path!
  const questionMarkIndex = pathStr.indexOf('?')
  if (questionMarkIndex >= 0) {
    return pathStr.substring(0, questionMarkIndex)
  }
  return pathStr
}

// Helper function to normalize a path
// Ensures leading slash and removes trailing slashes
function normalizePath(path: string): string {
  let normalized = path
  // Ensure leading slash
  if (normalized.length == 0 || normalized.charAt(0) != '/') {
    normalized = '/' + normalized
  }
  // Remove trailing slashes (but keep root "/" as is)
  while (normalized.length > 1 && normalized.charAt(normalized.length - 1) == '/') {
    normalized = normalized.substring(0, normalized.length - 1)
  }
  return normalized
}

// Helper function to check if a path exists in an array
// Uses normalized paths and boundary-aware prefix matching to avoid false positives
export function isPathInArray(path: string | null, routes: string[]): bool {
  if (path == null) {
    return false
  }
  // Normalize the input path
  const normalizedPath = normalizePath(path!)

  for (let i = 0; i < routes.length; i++) {
    // Normalize each route
    const normalizedRoute = normalizePath(routes[i])

    // Exact match
    if (normalizedPath == normalizedRoute) {
      return true
    }

    // Prefix match with boundary check: path must start with route + "/"
    // This ensures "/auth/login/admin" matches "/auth/login" but "/not-auth/login" does not
    const routeWithSlash = normalizedRoute + '/'
    if (normalizedPath.length > normalizedRoute.length && normalizedPath.startsWith(routeWithSlash)) {
      return true
    }
  }
  return false
}

// Helper function to send 403 Forbidden response
export function sendForbiddenResponse(message: string): FilterHeadersStatusValues {
  const bodyJson = '{"error":"' + message + '"}'
  const bodyBytes = String.UTF8.encode(bodyJson)
  const bodyBuffer = bodyBytes

  // Create empty headers - try passing null or empty array
  // HeaderPair is likely a tuple type that AssemblyScript handles internally
  // Pass empty array and let the runtime handle it
  send_local_response(403, 'Forbidden', bodyBuffer, [], 0)

  return FilterHeadersStatusValues.StopIteration
}
