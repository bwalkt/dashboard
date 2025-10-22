'use client'

import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Renders a table inside a horizontally scrollable container for responsive layouts.
 *
 * @param className - Additional CSS classes to merge onto the underlying table
 * @param props - All other standard HTML table props which are forwarded to the table element
 * @returns A table element wrapped in a container that enables horizontal scrolling and applies default table styling
 */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

/**
 * Renders a styled table header element with the data-slot "table-header".
 *
 * Merges the provided `className` with the component's header classes and forwards remaining props to the rendered `thead`.
 *
 * @returns The rendered `thead` element.
 */
function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

/**
 * Renders a table body element with a slot hook and default styling applied.
 *
 * @returns The rendered `tbody` element with `data-slot="table-body"` and merged class names (ensures the last row has no bottom border).
 */
function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

/**
 * Renders a table footer (<tfoot>) with standardized styling and a data-slot hook.
 *
 * Applies default footer classes, merges any provided `className`, and forwards all other props to the underlying `<tfoot>` element.
 *
 * @param className - Additional class names to append to the default footer styles
 * @returns The rendered `<tfoot>` element
 */
function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

/**
 * Renders a table row ('tr') element with standardized styling and a data-slot attribute.
 *
 * Merges the provided `className` with the component's default row classes, applies
 * `data-slot="table-row"`, and forwards all other props to the underlying `tr` element.
 *
 * @returns The rendered `tr` element with merged classes and forwarded props.
 */
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn('hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors', className)}
      {...props}
    />
  )
}

/**
 * Renders a table header cell (<th>) with standardized styling and a `data-slot="table-head"` hook.
 *
 * @returns A table header cell element with merged class names and all provided props forwarded to the `<th>` element.
 */
function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders a table cell element with a standardized data-slot and layout classes.
 *
 * @param className - Additional class names to merge with the component's default styles
 * @returns A `td` element with `data-slot="table-cell"`, merged class names, and any forwarded props
 */
function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders a table caption with muted styling and a data-slot for integration.
 *
 * @param className - Additional CSS classes to apply to the caption element
 * @returns The caption element with merged classes and `data-slot="table-caption"`
 */
function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption data-slot="table-caption" className={cn('text-muted-foreground mt-4 text-sm', className)} {...props} />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
