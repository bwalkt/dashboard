"use client";

import { IconFilter, IconFilterOff } from '@tabler/icons-react'
import { PanelLeftIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Breadcrumbs } from '../breadcrumbs'
import SearchInput from '../search-input'
import { DataTableFilterControls } from './data-table-filter-controls'
import { DataTableTitle } from './data-table-title'

export interface DualSidebarLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  hasFilters?: boolean
  style?: React.CSSProperties
  onSidebarToggle?: () => void
}

export function DualSidebarLayout({ children, title, description, hasFilters = false, style, onSidebarToggle }: DualSidebarLayoutProps) {
  const [showFilters, setShowFilters] = React.useState(hasFilters)
  
  // Update showFilters when hasFilters changes
  React.useEffect(() => {
    setShowFilters(hasFilters)
  }, [hasFilters])

  return (
    <div className="flex h-full w-full">
      {/* Filter sidebar - only show if hasFilters is true */}
      {hasFilters && showFilters && (
        <div className="w-80 border-r bg-background">
          <div className="p-4">
            <h3 className="font-medium text-sm text-muted-foreground mb-4">Filters</h3>
            <div className="px-2">
              <DataTableFilterControls />
            </div>
          </div>
        </div>
      )}
      
      {/* Main content area with title, breadcrumb/search at top */}
      <div className="flex flex-col flex-1">
        <div className="border-b border-border bg-background p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {onSidebarToggle ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSidebarToggle}
                        className="-ml-1 size-7"
                      >
                        <PanelLeftIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Toggle Sidebar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <SidebarTrigger className="-ml-1" title="Toggle Sidebar" />
              )}
              {hasFilters && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        {showFilters ? (
                          <IconFilterOff className="h-4 w-4" />
                        ) : (
                          <IconFilter className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{showFilters ? "Hide Filters" : "Show Filters"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {(title || description) && (
              <DataTableTitle title={title || ""} description={description} />
            )}
            <div className="ml-auto">
              <SearchInput />
            </div>
          </div>
        </div>
        
        {import.meta.env.VITE_CONFIG_BREADCRUMB && (
          <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <Breadcrumbs />
          </div>
        )}
        
        <main className="flex-1 overflow-auto" style={style}>
          {children}
        </main>
      </div>
    </div>
  )
}