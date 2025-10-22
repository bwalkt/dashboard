'use client'

import { GripVerticalIcon } from 'lucide-react'
import type * as React from 'react'
import * as ResizablePrimitive from 'react-resizable-panels'

import { cn } from '@/lib/utils'

/**
 * Wraps the ResizablePrimitive.PanelGroup to standardize attributes and responsive layout.
 *
 * @param className - Additional classes to append to the default container classes.
 * @returns A `PanelGroup` element with `data-slot="resizable-panel-group"` and a composed className that enables responsive horizontal/vertical layout.
 */
function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', className)}
      {...props}
    />
  )
}

/**
 * Renders a resizable panel element with a standardized data-slot attribute.
 *
 * @param props - Props to forward to the underlying ResizablePrimitive.Panel
 * @returns The underlying Panel element with `data-slot="resizable-panel"` and all provided props applied
 */
function ResizablePanel({ ...props }: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

/**
 * Renders a stylized panel resize handle and optionally displays a visible grip icon.
 *
 * @param withHandle - When `true`, includes a small grip icon inside the handle for visual affordance.
 * @param className - Additional CSS classes to apply to the handle container.
 * @returns The configured PanelResizeHandle element with standardized attributes, styling, and optional grip.
 */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        'bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
