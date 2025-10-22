import * as React from 'react'

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/use-callback-ref/src/useCallbackRef.tsx
 */

/**
 * Create a stable function wrapper that always calls the latest provided callback.
 *
 * @param callback - The callback to keep a reference to; may be `undefined`.
 * @returns A function with the same signature as `callback` that maintains stable identity across renders and delegates each call to the most recent `callback`.
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
