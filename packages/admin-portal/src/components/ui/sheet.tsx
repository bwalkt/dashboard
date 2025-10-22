'use client'

import * as SheetPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Root wrapper component for the slide-over sheet.
 *
 * Renders the sheet root element with a `data-slot="sheet"` attribute and applies any provided props.
 *
 * @param props - Props to apply to the sheet root element
 * @returns A React element rendering the sheet root with the `data-slot="sheet"` attribute
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

/**
 * Trigger element for opening the sheet.
 *
 * Renders a trigger that forwards all received props and includes a `data-slot="sheet-trigger"` attribute for slot-based styling.
 *
 * @returns The rendered trigger element for the sheet.
 */
function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

/**
 * Renders a close trigger for the sheet.
 *
 * @param props - Props forwarded to Radix UI's `SheetPrimitive.Close` component.
 * @returns The sheet close trigger element with `data-slot="sheet-close"`.
 */
function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

/**
 * Wraps Radix's Portal primitive and marks it with the `data-slot="sheet-portal"` attribute.
 *
 * @param props - Props forwarded to the underlying Radix Portal primitive
 * @returns The Portal element with `data-slot="sheet-portal"` and the provided props
 */
function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

/**
 * Renders the sheet backdrop overlay with base styling and open/close animations.
 *
 * @param className - Additional class names to merge with the component's base classes.
 * @returns The overlay element used as the sheet backdrop with animations and merged classes.
 */
function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders the sheet's content inside a portal with an overlay and a built-in close button, applying side-specific placement and slide animations.
 *
 * @param className - Additional CSS class names to apply to the content container.
 * @param children - Elements rendered inside the sheet content.
 * @param side - Side from which the sheet appears: `'top'`, `'right'`, `'bottom'`, or `'left'`. Defaults to `'right'`.
 * @returns The composed sheet content element (wrapped in a portal with overlay and a close control).
 */
function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

/**
 * Renders the sheet header as a div with the component's standard header layout and slot attribute.
 *
 * Accepts standard div props and merges a provided `className` with the component's base header classes.
 *
 * @returns The header element for a Sheet, rendered as a `div` with `data-slot="sheet-header"`.
 */
function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
}

/**
 * Footer region of the sheet that provides consistent spacing and layout.
 *
 * @param className - Additional class names to merge with the component's base styles
 * @returns The rendered sheet footer element
 */
function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
}

/**
 * Renders the sheet's title element with base typography and forwards additional props.
 *
 * @returns A React element representing the sheet title
 */
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  )
}

/**
 * Renders the sheet's description text with consistent typography and a `data-slot` attribute.
 *
 * @param className - Additional CSS classes to merge with the component's default text styling
 * @returns The sheet description element
 */
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
