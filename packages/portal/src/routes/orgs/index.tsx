import { createFileRoute } from '@tanstack/react-router'
import DashboardLayout from '@/pages/dashboard/Layout'
import OrgsPage from '@/pages/dashboard/Orgs'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/orgs/')({
  component: OrgsPageWithLayout,
})

function OrgsPageWithLayout() {
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
    <DashboardLayout fullWidth>
      <OrgsPage />
    </DashboardLayout>
  )
}
