import MainHeader from '@/components/layout/header'

export default function MainHeaderExample() {
  const handleFilterToggle = (isOpen: boolean) => {
    console.log('Filter toggle:', isOpen)
  }

  return (
    <div className="flex flex-col h-screen">
      <MainHeader
        title="Dashboard Overview"
        description="Monitor your system metrics and performance data"
        onFilterToggle={handleFilterToggle}
      />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Sample Card 1</h3>
            <p className="text-sm text-muted-foreground">Content goes here</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Sample Card 2</h3>
            <p className="text-sm text-muted-foreground">Content goes here</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Sample Card 3</h3>
            <p className="text-sm text-muted-foreground">Content goes here</p>
          </div>
        </div>
      </main>
    </div>
  )
}
