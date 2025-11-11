'use client'

import { useLocation } from '@tanstack/react-router'
import { useMemo } from 'react'

type BreadcrumbItem = {
  title: string
  link: string
}

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }],
  '/dashboard/overview': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Overview', link: '/dashboard/overview' },
  ],
  '/dashboard/logs': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Logs', link: '/dashboard/logs' },
  ],
  '/dashboard/users': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Users', link: '/dashboard/users' },
  ],
  '/dashboard/employee': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Employee', link: '/dashboard/employee' },
  ],
  '/dashboard/product': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Product', link: '/dashboard/product' },
  ],
  // Add more custom mappings as needed
}

/**
 * Compute breadcrumb items for the current location.
 *
 * Returns an array of breadcrumb objects describing the navigation path for the active pathname. Each item contains `title` (a capitalized segment label) and `link` (the cumulative path up to that segment). If an exact custom mapping exists for the current pathname, that mapping is returned instead.
 *
 * @returns An array of breadcrumb items with shape `{ title: string; link: string }`
 */
export function useBreadcrumbs() {
  const location = useLocation()
  const pathname = location.pathname

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname]
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean)
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path,
      }
    })
  }, [pathname])

  return breadcrumbs
}
