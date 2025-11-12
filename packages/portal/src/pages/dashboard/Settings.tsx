import Main from '@/components/layout/main'

export default function SettingsPage() {
  const handleFilterToggle = (isOpen: boolean) => {
    console.log('Settings filter toggle:', isOpen)
  }

  return (
    <Main 
      title="Settings" 
      description="Configure application preferences and options"
      onFilterToggle={handleFilterToggle}
    >
      <div className="p-6">
        <p>Settings page content goes here</p>
      </div>
    </Main>
  )
}
