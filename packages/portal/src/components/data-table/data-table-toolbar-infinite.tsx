'use client'

import { useMemo } from 'react'
import { useDataTable } from '@/components/data-table/data-table-provider'
import { formatCompactNumber } from '@/lib/format'
import { DataTableFilterControlsDrawer } from './data-table-filter-controls-drawer'
import { DataTableResetButtonWithUrl } from './data-table-reset-button-with-url'
import { DataTableViewOptions } from './data-table-view-options'

interface DataTableToolbarInfiniteProps {
  renderActions?: () => React.ReactNode
  searchParamsParser: Record<string, any>
}

export function DataTableToolbarInfinite({ renderActions, searchParamsParser }: DataTableToolbarInfiniteProps) {
  const { table, isLoading, columnFilters } = useDataTable()
  const filters = table.getState().columnFilters

  const rows = useMemo(
    () => ({
      total: table.getCoreRowModel().rows.length,
      filtered: table.getFilteredRowModel().rows.length,
    }),
    [isLoading, columnFilters],
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="block sm:hidden">
          <DataTableFilterControlsDrawer />
        </div>
        <div>
          <p className="hidden text-sm text-muted-foreground sm:block">
            <span className="font-mono font-medium">{formatCompactNumber(rows.filtered)}</span> of{' '}
            <span className="font-mono font-medium">{formatCompactNumber(rows.total)}</span> row(s){' '}
            <span className="sr-only sm:not-sr-only">filtered</span>
          </p>
          <p className="block text-sm text-muted-foreground sm:hidden">
            <span className="font-mono font-medium">{formatCompactNumber(rows.filtered)}</span> row(s)
          </p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {filters.length ? <DataTableResetButtonWithUrl searchParamsParser={searchParamsParser} /> : null}
        {renderActions?.()}
        <DataTableViewOptions />
      </div>
    </div>
  )
}
