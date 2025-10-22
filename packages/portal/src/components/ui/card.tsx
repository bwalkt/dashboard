import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Renders a styled card container.
 *
 * Renders a div with `data-slot="card"`, applies the component's default card styles and merges any provided `className`. All other div props are spread onto the rendered element.
 *
 * @param className - Additional class names to merge with the component's default styles
 * @returns A div element configured as a card container
 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm', className)}
      {...props}
    />
  )
}

/**
 * Renders a header section for a Card with a responsive grid layout and `data-slot="card-header"`.
 *
 * @returns A div element with `data-slot="card-header"` whose className combines the component's layout classes with any provided `className`, and which forwards any other div props.
 */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders the card title element.
 *
 * @param className - Additional CSS classes to merge with the default title styles
 * @returns The title element with default title styles, the merged `className`, and any other passed props applied
 */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('leading-none font-semibold', className)} {...props} />
}

/**
 * Renders a container for a card's descriptive text with muted, small typography.
 *
 * @returns A `div` element for card descriptions with `data-slot="card-description"`; its class list includes `text-muted-foreground text-sm` merged with any provided `className`.
 */
function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('text-muted-foreground text-sm', className)} {...props} />
}

/**
 * Renders a div used to place end-aligned action controls within a Card.
 *
 * Merges a default grid-alignment class set with any provided `className` and forwards remaining div props to the element.
 *
 * @returns The action slot element for a Card component.
 */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

/**
 * Renders the card's content container with base horizontal padding.
 *
 * @returns A `div` element with `data-slot="card-content"`, `px-6` padding, and any provided `className` and other `div` props applied.
 */
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />
}

/**
 * Provides a styled container for card footer content, applying footer-specific layout and spacing.
 *
 * @returns A JSX element representing the card footer container.
 */
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center px-6 [.border-t]:pt-6', className)} {...props} />
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
