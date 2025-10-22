'use client'

import * as SeparatorPrimitive from '@radix-ui/react-separator'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Render a horizontal or vertical separator with preset styling.
 *
 * @param className - Optional additional CSS classes to apply to the separator
 * @param orientation - Layout orientation of the separator; "horizontal" or "vertical" (default: "horizontal")
 * @param decorative - Whether the separator is decorative for assistive technologies (default: true)
 * @returns The rendered separator element
 */
function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
