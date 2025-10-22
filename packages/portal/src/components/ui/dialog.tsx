'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Root-level Dialog component that renders a Radix Dialog root element tagged with `data-slot="dialog"`.
 *
 * @returns A React element representing the dialog root with `data-slot="dialog"`. All received props are forwarded to the underlying Radix Dialog primitive.
 */
function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

/**
 * Renders the dialog trigger element and attaches `data-slot="dialog-trigger"`.
 *
 * @returns The trigger element for the dialog with the provided props applied.
 */
function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/**
 * Renders a Radix Dialog Portal element tagged with `data-slot="dialog-portal"`.
 *
 * @returns The rendered DialogPrimitive.Portal element with the `data-slot='dialog-portal'` attribute and any provided props applied.
 */
function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/**
 * Renders a dialog close control tagged with data-slot 'dialog-close'.
 *
 * @returns A React element representing the dialog close button with all received props forwarded.
 */
function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/**
 * Renders the dialog backdrop overlay with default positioning, backdrop color, and open/close animations.
 *
 * @param className - Additional CSS classes to merge with the overlay's default classes
 * @returns The dialog overlay element with backdrop visuals and state-based animation classes
 */
function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders dialog content inside a portal with an overlay and an integrated close button.
 *
 * @param className - Additional CSS classes to merge with the component's default styling
 * @param children - Elements to render inside the dialog content
 * @returns The dialog content element wrapped in a portal with backdrop and close control
 */
function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/**
 * Renders the dialog header wrapper element.
 *
 * Applies default header layout and responsive text alignment, forwards remaining div props.
 *
 * @param className - Additional class names to merge with the header's default classes
 * @returns The header `div` element for a dialog
 */
function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

/**
 * Renders the dialog footer container with responsive layout and a data-slot for targeting.
 *
 * @returns A `div` element that serves as the dialog footer; it has `data-slot="dialog-footer"`, applies responsive layout classes (`flex`, reverse column on small screens, row with right alignment on larger screens), merges any provided `className`, and forwards remaining props.
 */
function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

/**
 * Renders the dialog's title element with standard typography and a `data-slot` of `dialog-title`.
 *
 * @returns The Radix Dialog `Title` element with the component's default title styles merged with any provided `className`
 */
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

/**
 * Renders the dialog description with default muted, small-text styling.
 *
 * @param className - Additional CSS classes to merge with the default `text-muted-foreground text-sm`
 * @returns A `DialogPrimitive.Description` element with merged classes, `data-slot="dialog-description"`, and forwarded props
 */
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
