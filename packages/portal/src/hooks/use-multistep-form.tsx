import { type ReactElement, useCallback, useState } from 'react'

/**
 * Manages indexed navigation for a multi-step form.
 *
 * @param steps - Array of React elements representing the ordered steps of the form.
 * @returns An object with:
 *  - `currentStepIndex`: the current step index,
 *  - `step`: the React element for the current step,
 *  - `steps`: the original steps array,
 *  - `isFirstStep`: `true` if the current step is the first step, `false` otherwise,
 *  - `isLastStep`: `true` if the current step is the last step, `false` otherwise,
 *  - `goTo`: function to set the current step index,
 *  - `next`: function to advance to the next step (clamped to the last step),
 *  - `back`: function to move to the previous step (clamped to the first step)
 */
export default function useMultistepForm(steps: ReactElement<any>[]) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const next = useCallback(() => {
    setCurrentStepIndex(i => Math.min(i + 1, steps.length - 1))
  }, [steps.length])

  const back = useCallback(() => {
    setCurrentStepIndex(i => Math.max(i - 1, 0))
  }, [])

  const goTo = useCallback((index: number) => {
    setCurrentStepIndex(index)
  }, [])

  return {
    currentStepIndex,
    step: steps[currentStepIndex],
    steps,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
    goTo,
    next,
    back,
  }
}
