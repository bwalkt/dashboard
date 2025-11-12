"use client";

import * as React from 'react'
import { IconFilter, IconFilterOff } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarTrigger } from '@/components/ui/sidebar'
import { DataTableFilterControls } from './data-table-filter-controls'
import { Breadcrumbs } from '../breadcrumbs'
import SearchInput from '../search-input'
import { DataTableTitle } from './data-table-title'

interface DualSidebarLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  hasFilters?: boolean
  style?: React.CSSProperties
}

export function DualSidebarLayout({ children, title, description, hasFilters = false, style }: DualSidebarLayoutProps) {
  const [showFilters, setShowFilters] = React.useState(hasFilters)
  
  // Update showFilters when hasFilters changes
  React.useEffect(() => {
    setShowFilters(hasFilters)
  }, [hasFilters])

  return (
    <div className="flex h-full w-full">
      {/* Filter sidebar - only show if hasFilters is true */}
      {hasFilters && showFilters && (
        <Sidebar side="left" className="w-80" collapsible="none">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Filters</SidebarGroupLabel>
              <div className="px-2">
                <DataTableFilterControls />
              </div>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      )}
      
      {/* Main content area with title, breadcrumb/search at top */}
      <div className="flex flex-col flex-1">
        <div className="border-b border-border bg-background p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  title={showFilters ? "Hide Filters" : "Show Filters"}
                >
                  {showFilters ? (
                    <IconFilterOff className="h-4 w-4" />
                  ) : (
                    <IconFilter className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {(title || description) && (
              <DataTableTitle title={title || ""} description={description} />
            )}
          </div>
        </div>
        
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Breadcrumbs />
          <div className="ml-auto">
            <SearchInput />
          </div>
        </div>
        
        <main className="flex-1 overflow-auto" style={style}>
          {children}
        </main>
      </div>
    </div>
  )
}