import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { UsersPage } from '@/features/users/components'
import DashboardLayout from '@/pages/dashboard/Layout'
import { AuthStore, useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/users/')({
  beforeLoad: async ({ location }) => {
    // Wait for auth check if loading
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max wait

    while (AuthStore.loading && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    // Check if user is authenticated
    if (!AuthStore.user) {
      throw redirect({
        to: '/auth/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }
  },
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
    // This should not happen as beforeLoad handles redirect
    // But keep as fallback
    window.location.href = '/auth/sign-in'
    return null
  }

  return (
    <DashboardLayout fullWidth>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <UsersPage />
      </Suspense>
    </DashboardLayout>
  )
}
