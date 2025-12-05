import { createFileRoute } from '@tanstack/react-router'
import DashboardLayout from '@/pages/dashboard/Layout'
import Overview from '@/pages/dashboard/Overview'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/overview')({
  component: OverviewWithLayout,
})

function OverviewWithLayout() {
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
      <Overview />
    </DashboardLayout>
  )
}
