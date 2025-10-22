import * as React from 'react'

import { useCallbackRef } from '@/hooks/use-callback-ref'

/**
 * Creates a debounced version of a callback that delays invocation by the specified number of milliseconds.
 *
 * @param callback - The function to debounce; it will be called with the latest arguments after the delay.
 * @param delay - Delay in milliseconds to wait after the last call before invoking `callback`.
 * @returns A function with the same parameters as `callback` that schedules `callback` to run after `delay` milliseconds; calling it again before the delay expires resets the wait.
 */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(callback: T, delay: number) {
  const handleCallback = useCallbackRef(callback)
  const debounceTimerRef = React.useRef(0)
  React.useEffect(() => () => window.clearTimeout(debounceTimerRef.current), [])

  const setValue = React.useCallback(
    (...args: Parameters<T>) => {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = window.setTimeout(() => handleCallback(...args), delay)
    },
    [handleCallback, delay],
  )

  return setValue
}
