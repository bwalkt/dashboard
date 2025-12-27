'use client'

import type { ColumnDef } from '@tanstack/react-table'
import React from 'react'
import { DataTable } from '@/app/data-table'
import type { DataTableFilterField } from '@/types/data-table'

interface CrudShellProps<T> {
  title: string
  description: string
  columns: ColumnDef<T>[]
  data: T[]
  filterFields?: DataTableFilterField<T>[]
  addButton?: React.ReactNode
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

export function CrudShell<T>({
  title,
  description,
  columns,
  data,
  filterFields,
  addButton,
  isLoading,
  error,
  onRetry,
}: CrudShellProps<T>) {
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Show error state only if there's no data to display
  if (error && onRetry && data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load {title.toLowerCase()}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      filterFields={filterFields}
      title={title}
      description={description}
      containerPadding={false}
      cellPadding="sm"
      groupByComponent={addButton}
    />
  )
}
