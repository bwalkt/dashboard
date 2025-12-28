import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { UsersPage } from '@/features/users/components'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/users/')({
  component: UsersPageWithLayout,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function UsersPageWithLayout() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
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
        <UsersPage />
      </Suspense>
    </DashboardLayout>
  )
}
