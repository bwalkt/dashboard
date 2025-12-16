import { createFileRoute } from '@tanstack/react-router'
import InfinitePage from '@/app/infinite/page'
import { type SearchParamsType, searchParamsCache } from '@/app/infinite/search-params'

export const Route = createFileRoute('/dashboard/logs')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    // If there are no search params, return empty object to avoid defaults
    if (!search || Object.keys(search).length === 0) {
      return {}
    }

    try {
      const parsed = searchParamsCache.parse(search)
      // Filter out empty arrays, null values, and "null" strings
      const filtered = Object.fromEntries(
        Object.entries(parsed).filter(([_, value]) => {
          if (value === null || value === undefined) return false
          if (value === 'null' || value === '"null"') return false
          if (Array.isArray(value) && value.length === 0) return false
          return true
        }),
      )
      return filtered
    } catch (error) {
      // Return empty object if parsing fails, allowing defaults to be used
      return {}
    }
  },
})

function RouteComponent() {
  const search = Route.useSearch()

  return <InfinitePage searchParams={search} />
}
