import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AddOrgForm } from '@/features/orgs/components/add-org-form'
import DashboardLayout from '@/pages/dashboard/Layout'
import OrgsPage from '@/pages/dashboard/Orgs'

export const Route = createFileRoute('/orgs/new')({
  component: NewOrgPageWithLayout,
})

function NewOrgPageWithLayout() {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate({ to: '/orgs' })
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <OrgsPage />
        <AddOrgForm open={true} onOpenChange={handleClose} asPage={false} />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
