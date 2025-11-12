import { DualSidebarLayout } from '@/components/data-table/dual-sidebar'
import Overview from '@/features/overview/components/overview'

export default function OverviewPage() {
  return (
    <DualSidebarLayout 
      title="Dashboard" 
      description="Overview of your system metrics and analytics"
      hasFilters={false}
    >
      <div className="p-4">
        <Overview />
      </div>
    </DualSidebarLayout>
  )
}
