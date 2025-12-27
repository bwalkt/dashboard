import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import DefaultPage from '@/app/data-table/page'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/data-table/users')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => search,
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
      <Suspense fallback={<div>Loading...</div>}>
        <DefaultPage
          searchParams={Promise.resolve(search as { [key: string]: string | string[] | undefined })}
          title="Users"
          description="Manage and monitor user accounts and their activity"
        />
      </Suspense>
    </DashboardLayout>
  )
}
