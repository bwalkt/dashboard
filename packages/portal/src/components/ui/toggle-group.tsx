'use client'

import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import type { VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { toggleVariants } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: 'default',
  variant: 'default',
})

/**
 * Renders a styled toggle group root and provides `variant` and `size` to descendant items via context.
 *
 * The component sets data attributes (`data-variant`, `data-size`) on the root and composes a base
 * className with any additional `className` passed in.
 *
 * @param className - Additional CSS classes to apply to the toggle group root
 * @param variant - Visual variant applied to the group and forwarded to child items through context
 * @param size - Size modifier applied to the group and forwarded to child items through context
 * @param children - ToggleGroup items or other children to render inside the group
 * @returns The ToggleGroup root element
 */
function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        'group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs',
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

/**
 * Renders a styled toggle group item that prefers variant and size from the enclosing ToggleGroup context and falls back to its own props.
 *
 * @param className - Additional CSS classes to apply to the item
 * @param variant - Visual variant for the item; used when the group context does not provide a variant
 * @param size - Size for the item; used when the group context does not provide a size
 * @returns The rendered ToggleGroupPrimitive.Item element with computed variant/size classes and layout styles applied
 */
function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        'min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l',
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
