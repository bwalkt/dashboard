import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { UsersPage } from '@/features/users/components'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'

export const Route = createFileRoute('/users/')({
  component: UsersPageWithLayout,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function UsersPageWithLayout() {
  // Auth is already handled by beforeLoad
  return (
    <DashboardLayout fullWidth>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <UsersPage />
      </Suspense>
    </DashboardLayout>
  )
}
