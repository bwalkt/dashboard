'use client'

import * as AvatarPrimitive from '@radix-ui/react-avatar'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Renders an avatar root element with standardized avatar styling and forwards all props to the underlying root.
 *
 * @param className - Additional CSS classes merged with the component's default avatar classes
 * @returns A React element representing the avatar root
 */
function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

/**
 * Renders an avatar image element with standardized styling.
 *
 * @param className - Additional CSS class names to merge with the component's default classes
 * @param props - Remaining props passed through to the underlying Radix AvatarImage component
 * @returns The rendered AvatarPrimitive.Image element
 */
function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image data-slot="avatar-image" className={cn('aspect-square size-full', className)} {...props} />
  )
}

/**
 * Renders a fallback avatar UI used when the avatar image is unavailable or fails to load.
 *
 * @param className - Additional CSS class names to merge with the component's default styling
 * @returns `JSX.Element` rendering the fallback avatar element
 */
function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn('bg-muted flex size-full items-center justify-center rounded-full', className)}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
