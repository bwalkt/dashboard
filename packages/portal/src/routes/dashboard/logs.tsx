import { createFileRoute } from '@tanstack/react-router'
import InfinitePage from '@/app/infinite/page'
import { type SearchParamsType, searchParamsCache } from '@/app/infinite/search-params'

export const Route = createFileRoute('/dashboard/logs')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    try {
      return searchParamsCache.parse(search)
    } catch (error) {
      // Return empty object if parsing fails, allowing defaults to be used
      return {}
    }
  },
})

function RouteComponent() {
  const search = Route.useSearch()
  
  // Render the InfinitePage directly without wrapper to match original styling  
  return <InfinitePage searchParams={search} />
}