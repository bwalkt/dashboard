'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { SearchIcon } from 'lucide-react'
import type * as React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Wraps the cmdk Command primitive with theme-consistent classes and forwards all received props.
 *
 * @param className - Additional class names to merge with the component's default styling
 * @param props - Remaining props passed through to the underlying CommandPrimitive
 * @returns A CommandPrimitive element with the composed `className` and forwarded props
 */
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Render a Dialog-wrapped command palette with an accessible title and description.
 *
 * @param title - Accessible title exposed to screen readers; defaults to "Command Palette"
 * @param description - Accessible description exposed to screen readers; defaults to "Search for a command to run..."
 * @returns The Dialog element containing the styled Command palette and its children.
 */
function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Renders a styled command palette input with a leading search icon.
 *
 * Renders a wrapper containing a search icon and a CommandPrimitive.Input with
 * consistent spacing, sizing, and placeholder styling suitable for a command palette.
 *
 * @param className - Optional additional class names applied to the input element
 * @returns The rendered input wrapper element for use inside the command palette
 */
function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-9 items-center gap-2 border-b px-3">
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  )
}

/**
 * Renders a styled wrapper around the cmdk Command.List with consistent sizing and scroll behavior.
 *
 * @returns The `CommandPrimitive.List` element with a maximum height, vertical scrolling, hidden horizontal overflow, and any additional `className` merged in.
 */
function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', className)}
      {...props}
    />
  )
}

/**
 * Renders the empty-state slot for the command palette list with consistent styling.
 *
 * @returns A React element used when no command items match the current query; styled with vertical padding, centered alignment, and small text.
 */
function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className="py-6 text-center text-sm" {...props} />
}

/**
 * Renders a styled wrapper around `CommandPrimitive.Group` for grouping command items.
 *
 * @returns A `CommandPrimitive.Group` element with theme-consistent class names applied and all props forwarded.
 */
function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders a themed horizontal separator used within the command palette.
 *
 * @param className - Additional CSS classes to apply to the separator
 * @param props - Additional props forwarded to the underlying Separator element
 * @returns The separator element configured for the command palette
 */
function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('bg-border -mx-1 h-px', className)}
      {...props}
    />
  )
}

/**
 * Render a styled command palette item using the cmdk CommandPrimitive.Item primitive.
 *
 * The element includes theme-consistent classes for selection, disabled state, icon sizing, and layout; any received props (including `className`) are applied to the rendered item.
 *
 * @returns A `CommandPrimitive.Item` React element configured for use inside the command palette
 */
function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders a right-aligned, muted label for displaying a keyboard shortcut inside a command item.
 *
 * @param className - Additional CSS class names to merge with the default shortcut styles.
 * @param props - Other HTML span attributes forwarded to the element.
 * @returns A span element styled for displaying keyboard shortcuts.
 */
function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
