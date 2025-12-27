import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import LogsPage from '@/app/signoz/page'
import DashboardLayout from '@/pages/dashboard/Layout'

export const Route = createFileRoute('/logs')({
  component: LogsPageWithLayout,
})

function LogsPageWithLayout() {
  return (
    <DashboardLayout fullWidth>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <LogsPage />
      </Suspense>
    </DashboardLayout>
  )
}
