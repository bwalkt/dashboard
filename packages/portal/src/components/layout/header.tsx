import { IconFilter } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

interface MainHeaderProps {
  title: string
  description?: string
  onFilterToggle?: (isOpen: boolean) => void
}

export default function MainHeader({ title, description, onFilterToggle }: MainHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const handleFilterToggle = () => {
    const newState = !isFilterOpen
    setIsFilterOpen(newState)
    onFilterToggle?.(newState)
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleFilterToggle}
        className={`gap-2 ${isFilterOpen ? 'bg-accent text-accent-foreground' : ''}`}
      >
        <IconFilter className="h-4 w-4" />
        Filter
      </Button>
    </header>
  )
}