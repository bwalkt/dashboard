'use client'

import * as LabelPrimitive from '@radix-ui/react-label'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Renders a styled Radix UI Label primitive.
 *
 * @param className - Additional CSS classes appended to the component's default class list
 * @returns The LabelPrimitive.Root element with default utility classes, merged with `className`, `data-slot="label"`, and all other props forwarded
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
