import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { EndpointsPage } from '@/features/endpoints/components'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/endpoints/')({
  component: EndpointsPageWithLayout,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function EndpointsPageWithLayout() {
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
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <EndpointsPage />
      </Suspense>
    </DashboardLayout>
  )
}
