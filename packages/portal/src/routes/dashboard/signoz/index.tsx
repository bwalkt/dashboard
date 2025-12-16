import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/signoz/')({
  component: () => <Navigate to="/dashboard/signoz/traces" replace />,
})
