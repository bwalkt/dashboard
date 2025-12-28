import { createFileRoute } from '@tanstack/react-router'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayoutComponent,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function DashboardLayoutComponent() {
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

  return <DashboardLayout />
}
