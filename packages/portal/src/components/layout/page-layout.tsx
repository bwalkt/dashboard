'use client'

import * as React from 'react'
import { PageHeader } from './page-header'

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  hasFilters?: boolean
  onFilterToggle?: (isOpen: boolean) => void
  onSidebarToggle?: () => void
  showBreadcrumbs?: boolean
  renderFilters?: () => React.ReactNode
  style?: React.CSSProperties
}

export function PageLayout({
  children,
  title,
  description,
  hasFilters = false,
  onFilterToggle,
  onSidebarToggle,
  showBreadcrumbs,
  renderFilters,
  style,
}: PageLayoutProps) {
  const [showFilters, setShowFilters] = React.useState(hasFilters)

  const handleFilterToggle = (isOpen: boolean) => {
    setShowFilters(isOpen)
    onFilterToggle?.(isOpen)
  }

  React.useEffect(() => {
    setShowFilters(hasFilters)
  }, [hasFilters])

  return (
    <div className="flex h-full w-full">
      {/* Filter sidebar */}
      {hasFilters && showFilters && renderFilters && (
        <div className="w-80 border-r bg-background">
          <div className="p-4">
            <h3 className="font-medium text-sm text-muted-foreground mb-4">Filters</h3>
            {renderFilters()}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1">
        <PageHeader
          title={title}
          description={description}
          showFilters={hasFilters}
          onFilterToggle={handleFilterToggle}
          onSidebarToggle={onSidebarToggle}
          showBreadcrumbs={showBreadcrumbs}
        />

        <main className="flex-1 overflow-auto" style={style}>
          {children}
        </main>
      </div>
    </div>
  )
}
