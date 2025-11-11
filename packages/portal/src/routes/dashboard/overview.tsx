import { createFileRoute } from '@tanstack/react-router'
import Overview from '@/pages/dashboard/Overview'

export const Route = createFileRoute('/dashboard/overview')({
  component: Overview,
})