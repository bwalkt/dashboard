import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import DashboardLayout from '@/pages/dashboard/Layout'
import { ProxyTargetsPage } from '@/routes/dashboard/proxy-targets-components'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/endpoints/')({
  component: EndpointsPageWithLayout,
})

function EndpointsPageWithLayout() {
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
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <ProxyTargetsPage />
      </Suspense>
    </DashboardLayout>
  )
}