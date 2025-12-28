import { createFileRoute } from '@tanstack/react-router'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

const ProfilePage = () => {
  return <div>Prof</div>
}

function ProfilePageWithLayout() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return <AuthLoadingComponent />
  }

  if (!user) {
    // This should not happen as beforeLoad handles redirect
    // But keep as fallback
    window.location.href = '/auth/sign-in'
    return null
  }

  return (
    <DashboardLayout>
      <ProfilePage />
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/profile')({
  component: ProfilePageWithLayout,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})
