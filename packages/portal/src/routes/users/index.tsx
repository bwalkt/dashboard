import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import DashboardLayout from '@/pages/dashboard/Layout'
import { UsersPage } from '@/routes/dashboard/user-components'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/users/')({
  component: UsersPageWithLayout,
})

function UsersPageWithLayout() {
  const { user, loading } = useAuthStore()

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

  return (
    <DashboardLayout fullWidth>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <UsersPage />
      </Suspense>
    </DashboardLayout>
  )
}
