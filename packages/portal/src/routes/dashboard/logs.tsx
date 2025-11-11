import { createFileRoute } from '@tanstack/react-router'
import InfinitePage from '@/app/infinite/page'

export const Route = createFileRoute('/dashboard/logs')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => search,
})

function RouteComponent() {
  const search = Route.useSearch()
  
  // Render the InfinitePage directly without wrapper to match original styling
  return <InfinitePage searchParams={search as { [key: string]: string | string[] | undefined }} />
}