"use client";

import * as React from 'react'
import { MainLayout } from './main-layout'
import { DataTableFilterControls } from '../data-table/data-table-filter-controls'

export interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  hasFilters?: boolean
  style?: React.CSSProperties
}

export function AppLayout({ 
  children, 
  title, 
  description, 
  hasFilters = false, 
  style
}: AppLayoutProps) {
  const [showFilters, setShowFilters] = React.useState(hasFilters)
  
  React.useEffect(() => {
    setShowFilters(hasFilters)
  }, [hasFilters])

  return (
    <div className="flex h-full w-full">
      {/* Filter sidebar - only rendered when hasFilters is true AND showFilters is true */}
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
      
      {/* Main layout area */}
      <MainLayout
        title={title}
        description={description}
        hasFilters={hasFilters}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        style={style}
      >
        {children}
      </MainLayout>
    </div>
  )
}