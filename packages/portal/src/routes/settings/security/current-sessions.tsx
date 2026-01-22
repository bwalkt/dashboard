import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import DashboardLayout from '@/pages/dashboard/Layout'
import CurrentSessions from '@/pages/settings/security/CurrentSessions'

export const Route = createFileRoute('/settings/security/current-sessions')({
  component: CurrentSessionsWithLayout,
})

function CurrentSessionsWithLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <CurrentSessions />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
