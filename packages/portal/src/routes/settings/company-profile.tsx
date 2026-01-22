import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import DashboardLayout from '@/pages/dashboard/Layout'
import CompanyProfile from '@/pages/settings/CompanyProfile'

export const Route = createFileRoute('/settings/company-profile')({
  component: CompanyProfileWithLayout,
})

function CompanyProfileWithLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <CompanyProfile />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
