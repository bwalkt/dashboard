import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AddOrgForm } from '@/features/orgs/components/add-org-form'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/orgs/new')({
  component: NewOrgPageWithLayout,
})

function NewOrgPage() {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate({ to: '/orgs' })
  }

  return <AddOrgForm open={true} onOpenChange={handleClose} asPage={true} />
}

function NewOrgPageWithLayout() {
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
    <DashboardLayout>
      <NewOrgPage />
    </DashboardLayout>
  )
}
