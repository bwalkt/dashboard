import Overview from '@/features/overview/components/overview'
import { DualSidebarLayout } from '@/components/data-table/dual-sidebar'

export default function OverviewPage() {
  return (
    <DualSidebarLayout 
      title="Dashboard" 
      description="Overview of your system metrics and analytics"
    >
      <Overview />
    </DualSidebarLayout>
  )
}
