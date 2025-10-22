'use client'

import * as ProgressPrimitive from '@radix-ui/react-progress'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Visual progress bar component that displays a percentage-based indicator.
 *
 * The indicator's horizontal translation corresponds to the provided `value` as a percentage.
 *
 * @param value - Progress percentage in the range 0–100. If omitted or `undefined`, the progress is treated as 0.
 * @returns A React element rendering the progress bar.
 */
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
