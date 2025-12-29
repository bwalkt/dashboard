import { createFileRoute } from '@tanstack/react-router'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayoutComponent,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function DashboardLayoutComponent() {
  // Auth is already handled by beforeLoad
  return <DashboardLayout />
}
