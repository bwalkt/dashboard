'use client'

import { useEffect, useState } from 'react'

/**
 * Delays updates to a value and returns a debounced version.
 *
 * The returned value updates to the latest `value` only after `delay` milliseconds have passed without further changes.
 *
 * @param value - The input value to debounce
 * @param delay - Time in milliseconds to wait before updating the returned value
 * @returns The debounced value that reflects `value` after the specified delay
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
