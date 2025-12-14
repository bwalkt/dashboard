// Export required proxy functions for the proxy to interact with us
// @ts-ignore
export * from '@solo-io/proxy-runtime/proxy'

import { registerRootContext } from '@solo-io/proxy-runtime'
import { ChallengeHandlerRoot } from './handler'

registerRootContext((context_id: u32) => {
  return new ChallengeHandlerRoot(context_id)
}, 'challenge_handler')
