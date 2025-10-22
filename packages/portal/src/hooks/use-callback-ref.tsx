import * as React from 'react'

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/use-callback-ref/src/useCallbackRef.tsx
 */

/**
 * Returns a stable function that always invokes the latest provided callback.
 *
 * The returned function preserves its identity across renders so it can be safely passed
 * as a prop or used in effect dependency arrays; if `callback` is `undefined`, calls are ignored.
 *
 * @param callback - The callback to invoke from the stable wrapper (may be `undefined`)
 * @returns A function with the same call signature as `callback` that delegates to the most recent `callback`
 */
function useCallbackRef<T extends (...args: never[]) => unknown>(callback: T | undefined): T {
  const callbackRef = React.useRef(callback)

  React.useEffect(() => {
    callbackRef.current = callback
  })

  // https://github.com/facebook/react/issues/19240
  return React.useMemo(() => ((...args) => callbackRef.current?.(...args)) as T, [])
}

export { useCallbackRef }
