import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/**
 * Renders an alert container element with variant-driven styling and slot attributes.
 *
 * @param variant - Visual variant of the alert (e.g., `"default"` or `"destructive"`) that controls styling.
 * @returns A `div` element with `role="alert"`, `data-slot="alert"`, and a composed `className` reflecting the selected variant and any additional classes.
 */
function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

/**
 * Renders the alert title slot for the Alert component.
 *
 * @param className - Additional CSS classes to append to the title element
 * @param props - Other props are forwarded to the root `div` (e.g., event handlers, ARIA attributes)
 * @returns The rendered alert title element
 */
function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
      {...props}
    />
  )
}

/**
 * Renders the alert description slot styled for muted foreground text and relaxed spacing.
 *
 * @param className - Additional CSS classes to merge with the component's default styling
 * @returns The alert description div (data-slot="alert-description")
 */
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
