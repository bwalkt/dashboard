import { createFileRoute } from '@tanstack/react-router'
import { SignozTracesPage } from '@/components/signoz/SignozTracesPage'

export const Route = createFileRoute('/dashboard/signoz/traces')({
  component: SignozTracesPage,
})
