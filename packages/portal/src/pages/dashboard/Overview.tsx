import Overview from '@/features/overview/components/overview'
import Main from '@/components/layout/main'

export default function OverviewPage() {
  const handleFilterToggle = (isOpen: boolean) => {
    console.log('Overview filter toggle:', isOpen)
  }

  return (
    <Main 
      title="Dashboard" 
      description="Overview of your system metrics and analytics"
      onFilterToggle={handleFilterToggle}
    >
      <Overview />
    </Main>
  )
}
