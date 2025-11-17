'use client'

import { IconFilter, IconFilterOff } from '@tabler/icons-react'
import { PanelLeftIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Breadcrumbs } from '../breadcrumbs'
import SearchInput from '../search-input'

interface PageHeaderProps {
  title?: string
  description?: string
  showFilters?: boolean
  onFilterToggle?: (isOpen: boolean) => void
  onSidebarToggle?: () => void
  showBreadcrumbs?: boolean
}

export function PageHeader({
  title,
  description,
  showFilters = false,
  onFilterToggle,
  onSidebarToggle,
  showBreadcrumbs = false,
}: PageHeaderProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(showFilters)

  const handleFilterToggle = () => {
    const newState = !filtersOpen
    setFiltersOpen(newState)
    onFilterToggle?.(newState)
  }

  React.useEffect(() => {
    setFiltersOpen(showFilters)
  }, [showFilters])

  return (
    <div className="flex flex-col">
      {/* Main header bar */}
      <div className="flex h-16 items-center gap-4 border-b bg-background px-4">
        <div className="flex items-center gap-2">
          {/* Sidebar toggle */}
          {onSidebarToggle ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onSidebarToggle} className="-ml-1 size-7">
                    <PanelLeftIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Toggle Sidebar (Custom)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="-ml-1" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Toggle Sidebar (SidebarTrigger)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Filter toggle */}
          {showFilters && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleFilterToggle}>
                    {filtersOpen ? <IconFilterOff className="h-4 w-4" /> : <IconFilter className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{filtersOpen ? 'Hide Filters' : 'Show Filters'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Title and description */}
        {(title || description) && (
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}

        {/* Search */}
        <div className="ml-auto">
          <SearchInput />
        </div>
      </div>

      {/* Optional breadcrumbs */}
      {showBreadcrumbs && (
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Breadcrumbs />
        </div>
      )}
    </div>
  )
}
