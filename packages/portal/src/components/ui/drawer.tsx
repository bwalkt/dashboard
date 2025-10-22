'use client'

import type * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'

import { cn } from '@/lib/utils'

/**
 * Render the Drawer root element with a data-slot of 'drawer'.
 *
 * @param props - Props forwarded to the underlying DrawerPrimitive.Root component.
 * @returns The rendered Drawer root element
 */
function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

/**
 * Renders a Drawer trigger element that annotates the DOM with data-slot="drawer-trigger".
 *
 * @returns The Drawer trigger element with all provided props forwarded to vaul's trigger primitive.
 */
function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

/**
 * Renders a vaul Drawer portal wrapper and annotates it with a `data-slot` for composition.
 *
 * @returns The `DrawerPrimitive.Portal` element annotated with `data-slot="drawer-portal"` and forwarded props.
 */
function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

/**
 * Renders a drawer close trigger element with a data-slot of `drawer-close`.
 *
 * Forwards all received props to the rendered element.
 *
 * @returns A React element that acts as the drawer close trigger
 */
function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

/**
 * Renders the drawer overlay with default backdrop and open/close animations.
 *
 * @param className - Additional CSS classes to append to the overlay's default classes
 * @returns The overlay element used as the drawer backdrop with merged classes
 */
function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders the drawer content inside a portal with an overlay and direction-aware layout and styling.
 *
 * @param className - Additional CSS classes appended to the content container
 * @param children - Elements rendered inside the drawer content
 * @returns A JSX element that composes the portal, overlay, and styled drawer content
 */
function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          'group/drawer-content bg-background fixed z-50 flex h-auto flex-col',
          'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b',
          'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t',
          'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm',
          'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm',
          className,
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

/**
 * Renders the drawer header container.
 *
 * Renders a `div` with `data-slot="drawer-header"` and default layout and padding classes;
 * merges any provided `className` with the defaults and forwards other `div` props.
 *
 * @param className - Additional CSS classes appended to the default header classes
 * @returns A `div` element serving as the drawer header with forwarded props
 */
function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="drawer-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
}

/**
 * Container element for a drawer's footer that positions itself at the bottom and applies padding and vertical spacing.
 *
 * @returns The drawer footer element rendered as a div with bottom alignment, padding, and vertical gaps.
 */
function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="drawer-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
}

/**
 * Renders a drawer title element with base typography and forwarded props.
 *
 * @returns A `DrawerPrimitive.Title` element with the `text-foreground` and `font-semibold` classes applied, the provided `className` merged in, and all other props forwarded.
 */
function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  )
}

/**
 * Renders the drawer's description slot with muted, small text styling.
 *
 * @returns A Description element for the drawer content with `text-muted-foreground` and `text-sm` classes and `data-slot="drawer-description"`.
 */
function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
