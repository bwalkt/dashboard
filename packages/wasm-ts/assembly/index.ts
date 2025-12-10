import {
  Context,
  FilterHeadersStatusValues,
  LogLevelValues,
  log,
  RootContext,
  registerRootContext,
  set_shared_data,
  stream_context,
  WasmResultValues,
} from '@solo-io/proxy-runtime'

// Export required proxy functions for the proxy to interact with us
// @ts-ignore
export * from '@solo-io/proxy-runtime/proxy'

const CHALLENGE_ID_HEADER = 'x-challenge-id'
const CHALLENGE_ANSWER_HEADER = 'x-challenge-answer'
const SHARED_DATA_KEY_PREFIX = 'challenge:'

class ChallengeHandlerRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new ChallengeHandler(context_id, this)
  }
}

class ChallengeHandler extends Context {
  constructor(context_id: u32, root_context: ChallengeHandlerRoot) {
    super(context_id, root_context)
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    // Get request method and path for logging
    const method = stream_context.headers.request.get(':method')
    const path = stream_context.headers.request.get(':path')

    log(LogLevelValues.info, `[ChallengeHandler] Processing request: ${method} ${path}`)

    // Extract challenge headers
    const challengeID = stream_context.headers.request.get(CHALLENGE_ID_HEADER)
    const challengeAnswer = stream_context.headers.request.get(CHALLENGE_ANSWER_HEADER)

    // Check if challenge headers are present
    if (challengeID != null && challengeID.length > 0 && challengeAnswer != null && challengeAnswer.length > 0) {
      log(
        LogLevelValues.info,
        `[ChallengeHandler] Found challenge headers - ID: ${challengeID}, Answer: ${challengeAnswer}`,
      )

      // Store challenge in shared data
      const sharedDataKey = SHARED_DATA_KEY_PREFIX + challengeID
      const valueBytes = String.UTF8.encode(challengeAnswer)

      // Set shared data (CAS = 0 for unconditional write)
      const result = set_shared_data(sharedDataKey, valueBytes, 0)

      if (result == WasmResultValues.Ok) {
        log(LogLevelValues.info, `[ChallengeHandler] Stored challenge in shared data: ${sharedDataKey}`)
      } else {
        log(
          LogLevelValues.warn,
          `[ChallengeHandler] Failed to store challenge in shared data: ${sharedDataKey}, result: ${result}`,
        )
      }
    } else {
      log(LogLevelValues.debug, `[ChallengeHandler] Challenge headers not present or empty`)
    }

    return FilterHeadersStatusValues.Continue
  }
}

registerRootContext((context_id: u32) => {
  return new ChallengeHandlerRoot(context_id)
}, 'challenge_handler')
