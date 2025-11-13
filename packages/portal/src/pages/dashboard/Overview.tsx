import { AppLayout } from '@/components/layout/app-layout'
import Overview from '@/features/overview/components/overview'

export default function OverviewPage() {
  return (
    <AppLayout 
      title="Dashboard" 
      description="Overview of your system metrics and analytics"
      hasFilters={false}
    >
      <div className="p-4">
        <Overview />
      </div>
    </AppLayout>
  )
}
