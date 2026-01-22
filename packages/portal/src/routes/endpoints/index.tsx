import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { EndpointsPage } from '@/features/endpoints/components'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'

export const Route = createFileRoute('/endpoints/')({
  component: EndpointsPageWithLayout,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function EndpointsPageWithLayout() {
  // Auth is already handled by beforeLoad
  return (
    <DashboardLayout fullWidth>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <EndpointsPage />
      </Suspense>
    </DashboardLayout>
  )
}
