import {
  Context,
  FilterHeadersStatusValues,
  LogLevelValues,
  log,
  RootContext,
  set_shared_data,
  stream_context,
  WasmResultValues,
} from '@solo-io/proxy-runtime'
import {
  createChallengeEntry,
  generateChallengeId,
  generateRandomString,
  getChallengeFromSharedData,
} from './challenge'
import {
  CHALLENGE_ANSWER_HEADER,
  CHALLENGE_HEADER,
  CHALLENGE_ID_HEADER,
  CHALLENGE_TTL_SECONDS,
  LOGIN_ROUTES,
  PUBLIC_ROUTES,
  SHARED_DATA_KEY_PREFIX,
} from './constants'
import { isPathInArray, sanitizePath, sendForbiddenResponse } from './utils'

export class ChallengeHandlerRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new ChallengeHandler(context_id, this)
  }
}

export class ChallengeHandler extends Context {
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
      // TTL ensures challenges expire after 1 hour to prevent accumulation of stale data
      // Store as JSON with expiry timestamp since set_shared_data doesn't support TTL directly
      const sharedDataKey = SHARED_DATA_KEY_PREFIX + challengeId
      const entryJson = createChallengeEntry(challenge, CHALLENGE_TTL_SECONDS)
      const valueBytes = String.UTF8.encode(entryJson)
      // Use CAS 0 for unconditional write (third parameter is CAS, not TTL)
      const result = set_shared_data(sharedDataKey, valueBytes, 0)

      if (result == WasmResultValues.Ok) {
        log(LogLevelValues.info, `[ChallengeHandler] Successfully stored challenge in shared data`)
        log(LogLevelValues.debug, `[ChallengeHandler] Challenge stored with key: ${sharedDataKey}`)
      } else {
        log(LogLevelValues.warn, `[ChallengeHandler] Failed to store challenge in shared data, result: ${result}`)
        log(LogLevelValues.debug, `[ChallengeHandler] Failed to store challenge with key: ${sharedDataKey}`)
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
