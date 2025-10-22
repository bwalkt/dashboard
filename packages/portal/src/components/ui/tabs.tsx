'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Wraps the Radix Tabs root with default layout classes and a `data-slot="tabs"` attribute.
 *
 * @param className - Additional CSS class names to be merged with the default layout classes
 * @returns The rendered Tabs root element with combined class names and `data-slot="tabs"`
 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />
}

/**
 * Wraps Radix `TabsPrimitive.List` with default styling and a `data-slot="tabs-list"` attribute.
 *
 * @param className - Additional CSS classes to merge with the component's default styles
 * @returns A `TabsPrimitive.List` element with the component's default classes merged with `className` and `data-slot="tabs-list"`
 */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Render a styled tab trigger element for use within the Tabs component.
 *
 * @param className - Additional CSS class names to merge with the component's default styles
 * @returns A React element representing a tabs trigger with predefined styling and data-slot='tabs-trigger'
 */
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders a styled wrapper around Radix's TabsPrimitive.Content with a data-slot and merged className.
 *
 * @param className - Additional CSS classes to merge with the default "flex-1 outline-none"
 * @returns The rendered tab content element
 */
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
