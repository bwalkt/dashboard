import { createFileRoute } from '@tanstack/react-router'
import SignozPage from '@/app/signoz/page'

export const Route = createFileRoute('/dashboard/signoz')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SignozPage />
}
