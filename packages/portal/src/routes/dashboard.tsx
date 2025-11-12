import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/pages/dashboard/Layout'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayoutComponent,
})

function DashboardLayoutComponent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    throw redirect({ to: '/auth/sign-in' })
  }

  return <DashboardLayout />
}