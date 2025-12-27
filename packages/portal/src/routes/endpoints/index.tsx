import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { EndpointsPage } from '@/features/endpoints/components'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/endpoints/')({
  component: EndpointsPageWithLayout,
})

function EndpointsPageWithLayout() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    throw redirect({ to: '/auth/sign-in' })
  }

  return (
    <DashboardLayout fullWidth>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <EndpointsPage />
      </Suspense>
    </DashboardLayout>
  )
}
