import * as React from 'react'

import { useCallbackRef } from '@/hooks/use-callback-ref'

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/use-controllable-state/src/useControllableState.tsx
 */

type UseControllableStateParams<T> = {
  prop?: T | undefined
  defaultProp?: T | undefined
  onChange?: (state: T) => void
}

type SetStateFn<T> = (prevState?: T) => T

/**
 * Manages a value that can be either controlled by a prop or kept in internal state.
 *
 * When `prop` is provided the hook treats the value as controlled and only calls
 * `onChange` when an update differs from `prop`. When `prop` is undefined the hook
 * manages internal state initialized from `defaultProp`.
 *
 * @param prop - Controlled value; when present the hook mirrors this value.
 * @param defaultProp - Initial value used when the hook is uncontrolled.
 * @param onChange - Callback invoked with the new value when an update occurs.
 * @returns A tuple `[value, setValue]` where `value` is the current value (controlled or internal)
 *          and `setValue` updates the value (calls `onChange` in controlled mode or updates internal state).
 */
function useControllableState<T>({ prop, defaultProp, onChange = () => {} }: UseControllableStateParams<T>) {
  const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState({
    defaultProp,
    onChange,
  })
  const isControlled = prop !== undefined
  const value = isControlled ? prop : uncontrolledProp
  const handleChange = useCallbackRef(onChange)

  const setValue: React.Dispatch<React.SetStateAction<T | undefined>> = React.useCallback(
    nextValue => {
      if (isControlled) {
        const setter = nextValue as SetStateFn<T>
        const value = typeof nextValue === 'function' ? setter(prop) : nextValue
        if (value !== prop) handleChange(value as T)
      } else {
        setUncontrolledProp(nextValue)
      }
    },
    [isControlled, prop, setUncontrolledProp, handleChange],
  )

  return [value, setValue] as const
}

/**
 * Manages internal state for an uncontrolled value and invokes `onChange` when that value changes.
 *
 * The hook provides a React state tuple initialized from `defaultProp`. When the internal value
 * changes, the provided `onChange` callback is called with the new value.
 *
 * @param defaultProp - Initial value for the uncontrolled state (may be `undefined`)
 * @param onChange - Callback invoked whenever the internal value changes
 * @returns A React state tuple `[value, setValue]` where `value` is the current internal value (possibly `undefined`) and `setValue` updates it
 */
function useUncontrolledState<T>({ defaultProp, onChange }: Omit<UseControllableStateParams<T>, 'prop'>) {
  const uncontrolledState = React.useState<T | undefined>(defaultProp)
  const [value] = uncontrolledState
  const prevValueRef = React.useRef(value)
  const handleChange = useCallbackRef(onChange)

  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      handleChange(value as T)
      prevValueRef.current = value
    }
  }, [value, prevValueRef, handleChange])

  return uncontrolledState
}

export { useControllableState }
