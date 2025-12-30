import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import DashboardLayout from '@/pages/dashboard/Layout'
import MembersRoles from '@/pages/settings/MembersRoles'

export const Route = createFileRoute('/settings/members-roles')({
  component: MembersRolesWithLayout,
})

function MembersRolesWithLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MembersRoles />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
