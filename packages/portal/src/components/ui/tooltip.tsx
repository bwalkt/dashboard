'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Renders a Radix Tooltip provider with a preset data-slot and configurable open delay.
 *
 * @param delayDuration - Milliseconds to wait before showing the tooltip; defaults to `0`.
 * @param props - Additional props forwarded to the underlying `TooltipPrimitive.Provider`.
 * @returns A `TooltipPrimitive.Provider` element with `data-slot="tooltip-provider"`.
 */
function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}

/**
 * Wraps a Radix Tooltip root with the default TooltipProvider.
 *
 * @param props - Props forwarded to `TooltipPrimitive.Root`
 * @returns A JSX element that renders `TooltipPrimitive.Root` wrapped by `TooltipProvider`
 */
function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

/**
 * Renders a tooltip trigger element that forwards received props and adds a `data-slot="tooltip-trigger"` attribute.
 *
 * @returns A tooltip trigger JSX element with the provided props applied and `data-slot='tooltip-trigger'`.
 */
function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

/**
 * Render tooltip content inside a portal with preset styling and a positioned arrow.
 *
 * @param className - Optional additional CSS classes to merge with the component's default styling.
 * @param sideOffset - Distance in pixels between the tooltip content and the trigger; defaults to `0`.
 * @param children - Content to display inside the tooltip.
 * @returns The tooltip content element wrapped in a portal, including the content and its arrow.
 */
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
