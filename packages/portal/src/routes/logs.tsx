import { createFileRoute } from '@tanstack/react-router'
import InfinitePage from '@/app/infinite/page'
import { type SearchParamsType, searchParamsCache } from '@/app/infinite/search-params'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/logs')({
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

  // Temporarily bypass auth for development
  // const { user, loading } = useAuthStore()

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  //     </div>
  //   )
  // }

  // if (!user) {
  //   throw redirect({ to: '/auth/sign-in' })
  // }

  return (
    <DashboardLayout>
      <InfinitePage searchParams={search} />
    </DashboardLayout>
  )
}
