import { DualSidebarLayout } from '@/components/data-table/dual-sidebar'
import { useSidebar } from '@/components/ui/sidebar'
import Overview from '@/features/overview/components/overview'

export default function OverviewPage() {
  const { toggleSidebar } = useSidebar()
  
  return (
    <DualSidebarLayout 
      title="Dashboard" 
      description="Overview of your system metrics and analytics"
      hasFilters={false}
      onSidebarToggle={toggleSidebar}
    >
      <div className="p-4">
        <Overview />
      </div>
    </DualSidebarLayout>
  )
}
