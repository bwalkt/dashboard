import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'
import type * as React from 'react'
import { type Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Renders a centered navigation container for pagination controls.
 *
 * @param className - Additional CSS classes to apply to the nav element
 * @returns A `nav` element configured with pagination semantics and styling
 */
function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

/**
 * Renders a flex row <ul> element that serves as the pagination content container.
 *
 * @returns The `<ul>` element with `data-slot="pagination-content"` and default layout classes applied.
 */
function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="pagination-content" className={cn('flex flex-row items-center gap-1', className)} {...props} />
}

/**
 * Renders a list item element used as a pagination item.
 *
 * @returns A JSX `<li>` element with `data-slot="pagination-item"` and all provided props forwarded to it.
 */
function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>

/**
 * Renders a styled anchor element representing a pagination link.
 *
 * The link includes semantic and data attributes to indicate active state and uses button-style variants for appearance.
 *
 * @param isActive - When `true`, marks the link as the current page (`aria-current="page"`) and sets `data-active` to `true`.
 * @param size - Controls the visual size variant applied to the link (inherited from `Button` sizes). Defaults to `'icon'`.
 * @returns The rendered `<a>` element configured as a pagination control with appropriate attributes and classes.
 */
function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders a pagination control for navigating to the previous page.
 *
 * @returns A PaginationLink element with a left chevron icon and a "Previous" label (label is hidden on small screens).
 */
function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  )
}

/**
 * Renders a "Next" pagination control configured to navigate to the next page.
 *
 * @returns A PaginationLink element labeled "Next" with a right chevron icon, `aria-label="Go to next page"`, and default sizing.
 */
function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

/**
 * Renders an ellipsis indicator used to represent omitted pages in pagination.
 *
 * @param className - Additional CSS class names applied to the root span
 * @param props - Additional props forwarded to the root span element
 * @returns A span element containing a visual ellipsis icon and an accessible label for "More pages"
 */
function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
