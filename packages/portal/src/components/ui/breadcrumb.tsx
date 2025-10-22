import { Slot } from '@radix-ui/react-slot'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Renders a semantic breadcrumb navigation container.
 *
 * @param props - Props to apply to the underlying `<nav>` element; these are spread onto the element.
 * @returns The breadcrumb `<nav>` element with `aria-label="breadcrumb"` and `data-slot="breadcrumb"`.
 */
function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
}

/**
 * Renders an ordered list element styled and marked for use as a breadcrumb list.
 *
 * @param className - Additional CSS classes to merge with the component's default breadcrumb list styles
 * @returns An `<ol>` element with `data-slot="breadcrumb-list"`, default breadcrumb list classes, and any forwarded props
 */
function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders a breadcrumb list item with standard layout classes and a `data-slot="breadcrumb-item"` attribute.
 *
 * @param className - Additional CSS classes to merge with the component's default inline-flex, alignment, and gap styles
 * @returns A `<li>` element configured as a breadcrumb item
 */
function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="breadcrumb-item" className={cn('inline-flex items-center gap-1.5', className)} {...props} />
}

/**
 * Renders a breadcrumb link element and applies consistent breadcrumb link styles.
 *
 * When `asChild` is true, the component renders a Radix `Slot` so callers can supply a custom element; otherwise it renders a native `a` element.
 *
 * @param asChild - If true, use `Slot` to delegate rendering to the child element.
 * @param className - Additional CSS classes to merge with the default link styles.
 * @returns The rendered anchor or `Slot` element configured as a breadcrumb link.
 */
function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : 'a'

  return (
    <Comp data-slot="breadcrumb-link" className={cn('hover:text-foreground transition-colors', className)} {...props} />
  )
}

/**
 * Renders the current page label within a breadcrumb as an accessible, inactive page element.
 *
 * @returns A `span` element representing the current breadcrumb page with `role="link"`, `aria-current="page"`, and `aria-disabled="true"`.
 */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('text-foreground font-normal', className)}
      {...props}
    />
  )
}

/**
 * Renders a breadcrumb separator list item.
 *
 * Renders an `<li>` with presentation-only semantics and sizing classes; displays `children` if provided, otherwise a right chevron icon.
 *
 * @param children - Optional content to render inside the separator. Defaults to a `ChevronRight` icon when omitted.
 * @param className - Additional CSS classes appended to the separator's default sizing classes.
 * @returns The separator `<li>` element ready to be used between breadcrumb items.
 */
function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  )
}

/**
 * Renders the breadcrumb ellipsis used to indicate collapsed breadcrumb items.
 *
 * The element is presentation-only (role="presentation", aria-hidden="true"), contains a MoreHorizontal icon
 * and a visually hidden "More" label for screen readers, and accepts standard span props.
 *
 * @returns The ellipsis breadcrumb element containing a `MoreHorizontal` icon and a hidden "More" label
 */
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
