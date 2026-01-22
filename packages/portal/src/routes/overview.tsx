import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import DashboardLayout from '@/pages/dashboard/Layout'
import Overview from '@/pages/dashboard/Overview'

export const Route = createFileRoute('/overview')({
  component: OverviewWithLayout,
})

function OverviewWithLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Overview />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
