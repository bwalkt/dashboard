'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type * as React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Wraps the Radix AlertDialog root component, attaching a data-slot and forwarding all props.
 *
 * @returns A React element rendering the Radix AlertDialog Root with data-slot `'alert-dialog'` and the provided props.
 */
function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

/**
 * Wraps the Radix AlertDialog Trigger and applies a `data-slot="alert-dialog-trigger"` attribute.
 *
 * @returns The Radix AlertDialog Trigger React element with `data-slot="alert-dialog-trigger"` and any provided props.
 */
function AlertDialogTrigger({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

/**
 * Renders a Radix AlertDialog Portal with a `data-slot` of "alert-dialog-portal" and forwards all props.
 *
 * @param props - Props forwarded to the underlying Radix AlertDialogPrimitive.Portal
 * @returns The Portal element configured with the `data-slot="alert-dialog-portal"` attribute
 */
function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

/**
 * Overlay layer for the alert dialog that provides the semi-transparent backdrop, animation states, and a data-slot hook.
 *
 * @returns A positioned overlay element used as the dialog backdrop with open/close animation classes and `data-slot="alert-dialog-overlay"`.
 */
function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders alert dialog content inside a portal with an overlay and standardized styling hooks.
 *
 * @param className - Additional class names appended to the content element.
 * @returns The alert dialog content element with portal and overlay applied.
 */
function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

/**
 * Header container for an alert dialog that arranges content vertically and applies responsive text alignment.
 *
 * @param className - Additional CSS classes to merge with the component's default header classes
 * @returns The rendered header element for the alert dialog
 */
function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

/**
 * Footer container for an alert dialog that arranges action elements.
 *
 * Renders a div with `data-slot="alert-dialog-footer"` and a responsive layout that stacks children in
 * column-reverse on small screens and aligns them in a row to the end on larger screens. Any provided
 * `className` is merged with the component's default classes.
 *
 * @param className - Optional additional CSS classes to apply to the footer container
 * @returns A div element serving as the footer area for the alert dialog
 */
function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

/**
 * Renders the dialog's title element with preset typography and a data-slot for styling hooks.
 *
 * @returns The title element with predefined classes (`text-lg font-semibold`) and any forwarded props.
 */
function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
}

/**
 * Renders the dialog's descriptive text with muted styling and a `data-slot` of `alert-dialog-description`.
 *
 * @returns The AlertDialog description element.
 */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

/**
 * Renders an AlertDialog action button with the default button styling applied.
 *
 * @param className - Additional CSS class names to merge with the component's default button variant classes
 * @returns A styled AlertDialog action element
 */
function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />
}

/**
 * Renders an alert dialog cancel button using the outline button variant and forwards all props.
 *
 * @param className - Additional CSS class names to merge with the component's outline button styles
 * @returns A Cancel button React element with outline styling and any provided props forwarded
 */
function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
