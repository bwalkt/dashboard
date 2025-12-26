import type { Org } from '@pzero/shared/pzero'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { OrgDrawer } from '@/features/orgs/components/org-drawer'
import DashboardLayout from '@/pages/dashboard/Layout'
import OrgsPage from '@/pages/dashboard/Orgs'
import { useOrgsStore } from '@/stores/orgs'

export const Route = createFileRoute('/orgs/new')({
  component: NewOrgPageWithLayout,
})

function NewOrgPageWithLayout() {
  const navigate = useNavigate()
  const orgsStore = useOrgsStore()

  const handleClose = () => {
    navigate({ to: '/orgs' })
  }

  const handleAdd = async (_newOrg: Org) => {
    try {
      await orgsStore.fetchOrgs() // Refresh the list
    } catch (error) {
      console.error('Failed to refresh orgs list:', error)
    }
    navigate({ to: '/orgs' })
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <OrgsPage />
        <OrgDrawer
          open={true}
          onOpenChange={open => {
            if (!open) handleClose()
          }}
          onAdd={handleAdd}
        />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
