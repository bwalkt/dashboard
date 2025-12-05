import { createFileRoute } from '@tanstack/react-router'
import OrgsPage from '@/pages/dashboard/Orgs'

export const Route = createFileRoute('/dashboard/orgs')({
  component: OrgsPage,
})
