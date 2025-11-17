import { Link as TanStackLink } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/utils'

export interface LinkProps {
  className?: string
  children?: React.ReactNode
  hideArrow?: boolean
  href: string
  to?: string
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, href, to, children, hideArrow, ...props }, ref) => {
    const linkHref = to || href
    const isInternal = linkHref?.toString().startsWith('/') || linkHref?.toString().startsWith('#')
    const externalLinkProps = !isInternal ? { target: '_blank', rel: 'noreferrer' } : undefined

    const linkClassName = cn(
      'group text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground',
      'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md',
      className,
    )

    // For internal links, use TanStack Router Link
    if (isInternal) {
      return (
        <TanStackLink className={linkClassName} ref={ref} to={linkHref} {...props}>
          {children}
        </TanStackLink>
      )
    }

    // For external links, use regular anchor tag
    return (
      <a className={linkClassName} ref={ref} href={linkHref} {...externalLinkProps} {...props}>
        {children}
        {!hideArrow ? (
          <ArrowUpRight className="text-muted-foreground w-4 h-4 inline-block ml-0.5 group-hover:text-foreground group-hover:-translate-y-px group-hover:translate-x-px" />
        ) : null}
      </a>
    )
  },
)

Link.displayName = 'Link'

export { Link }
