'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Renders a Popover root element and forwards received props to the underlying Radix Popover root.
 *
 * @param props - Props accepted by the Radix Popover root; all props are forwarded. This component adds `data-slot='popover'`.
 * @returns A React element rendering the configured Popover root.
 */
function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

/**
 * Renders a popover trigger element that forwards all received props and sets `data-slot="popover-trigger"`.
 *
 * @returns A React element representing the popover trigger with forwarded props and the `data-slot='popover-trigger'` attribute.
 */
function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

/**
 * Renders popover content inside a Portal, applying default alignment, side offset, and composed styling.
 *
 * @param className - Additional CSS classes to merge with the component's default styles
 * @param align - Alignment of the popover relative to the trigger; defaults to `'center'`
 * @param sideOffset - Distance in pixels between the popover and the trigger; defaults to `4`
 * @returns The rendered popover content element
 */
function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

/**
 * Renders a popover anchor element used to position popover content.
 *
 * @param props - Props forwarded to Radix UI's Popover.Anchor component.
 * @returns The rendered Popover.Anchor element with `data-slot='popover-anchor'` and all provided props applied.
 */
function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
