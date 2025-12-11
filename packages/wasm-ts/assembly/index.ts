import {
  Context,
  FilterHeadersStatusValues,
  get_shared_data,
  LogLevelValues,
  log,
  RootContext,
  registerRootContext,
  send_local_response,
  set_shared_data,
  stream_context,
  WasmResultValues,
} from '@solo-io/proxy-runtime'

// Export required proxy functions for the proxy to interact with us
// @ts-ignore
export * from '@solo-io/proxy-runtime/proxy'

const CHALLENGE_HEADER = 'x-challenge'
const CHALLENGE_ID_HEADER = 'x-challenge-id'
const CHALLENGE_ANSWER_HEADER = 'x-challenge-answer'
const SHARED_DATA_KEY_PREFIX = 'challenge:'

// Public routes that don't require authentication
const PUBLIC_ROUTES: string[] = [
  '/auth/register',
  '/auth/register/verify',
  '/auth/login',
  '/auth/login/verify',
  '/auth/logout',
  '/auth/callback',
  '/auth/callback/github',
  '/auth/refresh',
  '/centrifugo/connect',
  '/centrifugo/refresh',
  '/centrifugo/subscribe',
  '/centrifugo/publish',
  '/sms/verify',
  '/sms/verify/confirm',
  '/sms/verify/resend',
  '/email/verify',
  '/health',
  '/public',
  '/docs',
  '/assets',
  '/faq',
  '/terms',
  '/privacy',
]

// Login routes that require challenge header injection
const LOGIN_ROUTES: string[] = ['/auth/callback', '/auth/refresh']

// Helper function to sanitize path by removing query parameters
function sanitizePath(path: string | null): string | null {
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

// Helper function to check if a path exists in an array
function isPathInArray(path: string | null, routes: string[]): bool {
  if (path == null) {
    return false
  }
  // At this point, path is guaranteed to be non-null
  const pathStr = path!
  for (let i = 0; i < routes.length; i++) {
    if (pathStr.includes(routes[i])) {
      return true
    }
  }
  return false
}

// Helper function to generate a pseudo-random string for challenge header
// Uses context_id and path hash since Math.random() requires env.seed which isn't available
function generateRandomString(contextId: u32, path: string): string {
  // Use a simple hash-based approach to generate pseudo-random string
  // Combine context_id and path hash to create uniqueness
  let hash: u32 = contextId
  const pathLen = path.length

  // Simple hash of the path
  for (let i = 0; i < pathLen; i++) {
    hash = (hash << 5) - hash + u32(path.charCodeAt(i))
    hash = hash & hash // Convert to 32-bit integer
  }

  // Add some variation using bit manipulation
  hash = hash ^ (hash >> 16)
  hash = hash * 0x85ebca6b
  hash = hash ^ (hash >> 13)
  hash = hash * 0xc2b2ae35
  hash = hash ^ (hash >> 16)

  // Generate string from hash
  let result = ''
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let currentHash = hash

  for (let i = 0; i < 16; i++) {
    // Use hash bits to select character
    const index = u32(currentHash % u32(chars.length))
    result += chars.charAt(index)
    // Rotate hash for next character
    currentHash = (currentHash << 1) | (currentHash >> 31)
    currentHash = currentHash ^ (contextId + i)
  }

  return result
}

// Helper function to generate a unique challenge-id
// Uses different seed than challenge generation to ensure uniqueness
function generateChallengeId(contextId: u32, path: string): string {
  // Use a different hash seed by adding a constant offset
  let hash: u32 = contextId + 0x9e3779b9 // Golden ratio constant for better distribution
  const pathLen = path.length

  // Simple hash of the path with different multiplier
  for (let i = 0; i < pathLen; i++) {
    hash = (hash << 7) - hash + u32(path.charCodeAt(i)) // Different shift than challenge
    hash = hash & hash // Convert to 32-bit integer
  }

  // Add variation with different constants
  hash = hash ^ (hash >> 17)
  hash = hash * 0x9e3779b1
  hash = hash ^ (hash >> 11)
  hash = hash * 0xc2b2ae3d
  hash = hash ^ (hash >> 15)

  // Generate string from hash
  let result = ''
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let currentHash = hash

  for (let i = 0; i < 16; i++) {
    // Use hash bits to select character
    const index = u32(currentHash % u32(chars.length))
    result += chars.charAt(index)
    // Rotate hash for next character with different pattern
    currentHash = (currentHash << 3) | (currentHash >> 29)
    currentHash = currentHash ^ (contextId * (i + 1))
  }

  return result
}

// Helper function to read challenge from shared data
function getChallengeFromSharedData(challengeId: string): string | null {
  const sharedDataKey = SHARED_DATA_KEY_PREFIX + challengeId
  const result = get_shared_data(sharedDataKey)

  // Access the data - try using changetype to access the Uint8Array
  // The data should be stored in the result object
  const data = result.value
  if (data == null) {
    return null
  }

  // Decode the bytes back to string
  return String.UTF8.decode(data)
}

// Helper function to send 403 Forbidden response
function sendForbiddenResponse(message: string): FilterHeadersStatusValues {
  const bodyJson = '{"error":"' + message + '"}'
  const bodyBytes = String.UTF8.encode(bodyJson)
  const bodyBuffer = bodyBytes

  // Create empty headers - try passing null or empty array
  // HeaderPair is likely a tuple type that AssemblyScript handles internally
  // Pass empty array and let the runtime handle it
  send_local_response(403, 'Forbidden', bodyBuffer, [], 0)

  return FilterHeadersStatusValues.StopIteration
}

class ChallengeHandlerRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new ChallengeHandler(context_id, this)
  }
}

class ChallengeHandler extends Context {
  requestPath: string | null = null

  constructor(context_id: u32, root_context: ChallengeHandlerRoot) {
    super(context_id, root_context)
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    // Get request method and path for logging
    const method = stream_context.headers.request.get(':method')
    const path = stream_context.headers.request.get(':path')

    // Store the path in instance property for concurrency safety
    if (path != null) {
      this.requestPath = path
    } else {
      this.requestPath = null
    }

    log(LogLevelValues.info, `[ChallengeHandler] Processing request: ${method} ${path}`)

    // Skip OPTIONS preflight requests for CORS - allow them through
    if (method != null && method.toUpperCase() == 'OPTIONS') {
      log(LogLevelValues.debug, `[ChallengeHandler] OPTIONS preflight request, skipping challenge verification`)
      return FilterHeadersStatusValues.Continue
    }

    // Sanitize the path by removing query parameters
    const sanitizedPath = sanitizePath(path)

    if (sanitizedPath == null) {
      log(LogLevelValues.debug, `[ChallengeHandler] Path is null, continuing`)
      return FilterHeadersStatusValues.Continue
    }

    // Check if path is in PUBLIC_ROUTES - if yes, skip verification
    if (isPathInArray(sanitizedPath, PUBLIC_ROUTES)) {
      const pathStr2 = sanitizedPath!
      log(LogLevelValues.debug, `[ChallengeHandler] Public route, skipping challenge verification: ${pathStr2}`)
      return FilterHeadersStatusValues.Continue
    }

    // Path is NOT in public routes - verify challenge
    const pathStr3 = sanitizedPath!
    log(LogLevelValues.info, `[ChallengeHandler] Non-public route, verifying challenge: ${pathStr3}`)

    // Extract challenge headers
    const challengeID = stream_context.headers.request.get(CHALLENGE_ID_HEADER)
    const challengeAnswer = stream_context.headers.request.get(CHALLENGE_ANSWER_HEADER)

    // Check if challenge headers are present
    if (challengeID == null || challengeID.length == 0 || challengeAnswer == null || challengeAnswer.length == 0) {
      const pathStr4 = sanitizedPath!
      log(LogLevelValues.warn, `[ChallengeHandler] Missing challenge headers for non-public route: ${pathStr4}`)
      return sendForbiddenResponse('missing challenge headers')
    }

    // Read stored challenge from shared data
    const storedChallenge = getChallengeFromSharedData(challengeID)

    if (storedChallenge == null) {
      log(LogLevelValues.warn, `[ChallengeHandler] Challenge not found in shared data for ID: ${challengeID}`)
      return sendForbiddenResponse('invalid challenge id')
    }

    // Compare challenge-answer with stored challenge
    if (challengeAnswer != storedChallenge) {
      log(LogLevelValues.warn, `[ChallengeHandler] Challenge answer mismatch for ID: ${challengeID}`)
      return sendForbiddenResponse('invalid challenge answer')
    }

    // Challenge verified successfully
    log(LogLevelValues.info, `[ChallengeHandler] Challenge verified successfully for ID: ${challengeID}`)

    return FilterHeadersStatusValues.Continue
  }

  onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    // Retrieve the stored path from instance property
    if (this.requestPath == null) {
      log(LogLevelValues.debug, `[ChallengeHandler] No stored path available for response headers`)
      return FilterHeadersStatusValues.Continue
    }

    // Sanitize the path by removing query parameters
    const sanitizedPath = sanitizePath(this.requestPath)

    if (sanitizedPath == null) {
      log(LogLevelValues.debug, `[ChallengeHandler] Sanitized path is null`)
      return FilterHeadersStatusValues.Continue
    }

    // Check if the sanitized path exists in the LOGIN_ROUTES array
    // At this point, sanitizedPath is guaranteed to be non-null
    const pathStr = sanitizedPath!
    if (isPathInArray(pathStr, LOGIN_ROUTES)) {
      // Generate challenge-id and challenge value
      const challengeId = generateChallengeId(this.context_id, pathStr)
      const challenge = generateRandomString(this.context_id, pathStr)

      // Store challenge in shared data with key challenge:{challenge-id}
      const sharedDataKey = SHARED_DATA_KEY_PREFIX + challengeId
      const valueBytes = String.UTF8.encode(challenge)
      const result = set_shared_data(sharedDataKey, valueBytes, 0)

      if (result == WasmResultValues.Ok) {
        log(LogLevelValues.info, `[ChallengeHandler] Stored challenge in shared data: ${sharedDataKey}`)
      } else {
        log(
          LogLevelValues.warn,
          `[ChallengeHandler] Failed to store challenge in shared data: ${sharedDataKey}, result: ${result}`,
        )
      }

      // Inject the X-challange header with challenge value
      stream_context.headers.response.add(CHALLENGE_HEADER, challenge)

      // Inject the X-challenge-id header with challenge-id
      stream_context.headers.response.add(CHALLENGE_ID_HEADER, challengeId)

      log(
        LogLevelValues.info,
        `[ChallengeHandler] Injected challenge headers for login route: ${pathStr}, challenge-id: ${challengeId}, challenge: ${challenge}`,
      )
    } else {
      log(LogLevelValues.debug, `[ChallengeHandler] Path ${pathStr} is not in login routes, skipping header injection`)
    }

    return FilterHeadersStatusValues.Continue
  }
}

registerRootContext((context_id: u32) => {
  return new ChallengeHandlerRoot(context_id)
}, 'challenge_handler')
