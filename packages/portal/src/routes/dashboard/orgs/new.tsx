import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AddOrgForm } from '@/features/orgs/components/add-org-form'

export const Route = createFileRoute('/dashboard/orgs/new')({
  component: NewOrgPage,
})

function NewOrgPage() {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate({ to: '/dashboard/orgs' })
  }

  return <AddOrgForm open={true} onOpenChange={handleClose} asPage={true} />
}
