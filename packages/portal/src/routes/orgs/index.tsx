import { createFileRoute } from '@tanstack/react-router'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'
import OrgsPage from '@/pages/dashboard/Orgs'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/orgs/')({
  component: OrgsPageWithLayout,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function OrgsPageWithLayout() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return <AuthLoadingComponent />
  }

  if (!user) {
    // This should not happen as beforeLoad handles redirect
    // But keep as fallback
    window.location.href = '/auth/sign-in'
    return null
  }

  return (
    <DashboardLayout fullWidth>
      <OrgsPage />
    </DashboardLayout>
  )
}
