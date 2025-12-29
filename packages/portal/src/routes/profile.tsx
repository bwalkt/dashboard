import { createFileRoute } from '@tanstack/react-router'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import DashboardLayout from '@/pages/dashboard/Layout'

const ProfilePage = () => {
  return <div>Prof</div>
}

function ProfilePageWithLayout() {
  // Auth is already handled by beforeLoad
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
