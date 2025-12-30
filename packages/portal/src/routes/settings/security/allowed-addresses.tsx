import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import DashboardLayout from '@/pages/dashboard/Layout'
import AllowedAddresses from '@/pages/settings/security/AllowedAddresses'

export const Route = createFileRoute('/settings/security/allowed-addresses')({
  component: AllowedAddressesWithLayout,
})

function AllowedAddressesWithLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AllowedAddresses />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
