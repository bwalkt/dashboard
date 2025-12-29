import { createFileRoute } from '@tanstack/react-router'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'
import OrgsPage from '@/pages/dashboard/Orgs'

export const Route = createFileRoute('/orgs/')({
  component: OrgsPageWithLayout,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function OrgsPageWithLayout() {
  // Auth is already handled by beforeLoad
  return (
    <DashboardLayout fullWidth>
      <OrgsPage />
    </DashboardLayout>
  )
}
