'use client'

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Renders a styled scrollable area composed of Radix ScrollArea primitives: a root, viewport for children, a scrollbar, and a corner.
 *
 * @param className - Additional CSS classes to apply to the root container
 * @param children - Content rendered inside the scroll viewport
 * @param props - Remaining props are forwarded to the underlying ScrollAreaPrimitive.Root
 * @returns A React element containing the configured scroll area with viewport, scrollbar, and corner
 */
function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn('relative', className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

/**
 * Renders a styled scrollbar for a ScrollArea with support for vertical or horizontal orientation.
 *
 * @param orientation - The scrollbar orientation, either `'vertical'` or `'horizontal'`. Defaults to `'vertical'`.
 * @param className - Additional CSS class names to apply to the scrollbar container.
 * @returns The ScrollArea scrollbar element containing a draggable thumb.
 */
function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
