'use client'

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDownIcon } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Render an Accordion root element with a `data-slot="accordion"` attribute.
 *
 * @returns The rendered Accordion root element (`AccordionPrimitive.Root`) with the provided props and a `data-slot` of `"accordion"`.
 */
function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

/**
 * Renders an accordion item element with default bottom-border styling and forwards all props to the underlying Radix primitive.
 *
 * @param className - Additional CSS class names appended to the component's default classes
 * @returns The Accordion item element with the combined `className` and all other props forwarded
 */
function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b last:border-b-0', className)}
      {...props}
    />
  )
}

/**
 * Renders a styled accordion trigger that displays children and a rotating chevron icon.
 *
 * @param className - Additional CSS classes to merge with the component's default styles
 * @param children - Elements or text shown inside the trigger before the chevron icon
 * @returns The rendered accordion trigger element
 */
function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/**
 * Renders accordion content with state-driven open/close animations and an inner padded container for children.
 *
 * The component applies overflow and text sizing to the content area, animates based on Radix state, and wraps
 * `children` in a div that applies top/bottom padding and any provided `className`.
 *
 * @returns The rendered accordion content element with state-based animations and an inner padded container for `children`.
 */
function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn('pt-0 pb-4', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
