import { createFileRoute } from '@tanstack/react-router'
import DashboardLayout from '@/pages/dashboard/Layout'
import { useAuthStore } from '@/stores/auth'

const ProfilePage = () => {
  return <div>Prof</div>
}

function ProfilePageWithLayout() {
  // Temporarily bypass auth for development
  // const { user, loading } = useAuthStore()

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  //     </div>
  //   )
  // }

  // if (!user) {
  //   throw redirect({ to: '/auth/sign-in' })
  // }

  return (
    <DashboardLayout>
      <ProfilePage />
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/profile')({
  component: ProfilePageWithLayout,
})
