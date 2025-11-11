import * as React from 'react'
import { cn } from '@/lib/utils'

interface DataTableTitleProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Consistent title component for data tables that appears in the main content area.
 * 
 * This ensures a consistent look and feel across all table pages and remains visible
 * even when the sidebar is collapsed.
 */
export function DataTableTitle({ 
  title, 
  description, 
  className, 
  children 
}: DataTableTitleProps) {
  return (
    <div className={cn("space-y-1 pb-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}