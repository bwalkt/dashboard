'use client'

import { Cross2Icon } from '@radix-ui/react-icons'
import type { Column, Table } from '@tanstack/react-table'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableDateFilter } from '@/components/ui/table/data-table-date-filter'
import { DataTableFacetedFilter } from '@/components/ui/table/data-table-faceted-filter'
import { DataTableSliderFilter } from '@/components/ui/table/data-table-slider-filter'
import { DataTableViewOptions } from '@/components/ui/table/data-table-view-options'
import { cn } from '@/lib/utils'

interface DataTableToolbarProps<TData> extends React.ComponentProps<'div'> {
  table: Table<TData>
}

/**
 * Renders a data table toolbar with per-column filter controls, a conditional reset control, and table view options.
 *
 * Renders a filter control for each column that allows filtering, shows a "Reset" button only when any column filters are active, and includes a slot for additional children followed by view options for the provided table.
 *
 * @param table - The table instance whose columns and filter state drive the toolbar's controls.
 * @param children - Optional additional toolbar content rendered to the right of the filters.
 * @returns The toolbar element containing filtering controls, reset action (when applicable), and view options.
 */
export function DataTableToolbar<TData>({ table, children, className, ...props }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const columns = React.useMemo(() => table.getAllColumns().filter(column => column.getCanFilter()), [table])

  const onReset = React.useCallback(() => {
    table.resetColumnFilters()
  }, [table])

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn('flex w-full items-start justify-between gap-2 p-1', className)}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {columns.map(column => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}
        {isFiltered && (
          <Button aria-label="Reset filters" variant="outline" size="sm" className="border-dashed" onClick={onReset}>
            <Cross2Icon />
            Reset
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>
}

/**
 * Render the appropriate filter control for a table column based on its metadata.
 *
 * @param column - The table column whose metadata (columnDef.meta) determines which filter control to render.
 * @returns A React element for the column's filter UI, or `null` when the column has no filter variant.
 */
function DataTableToolbarFilter<TData>({ column }: DataTableToolbarFilterProps<TData>) {
  {
    const columnMeta = column.columnDef.meta

    const onFilterRender = React.useCallback(() => {
      if (!columnMeta?.variant) return null

      switch (columnMeta.variant) {
        case 'text':
          return (
            <Input
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={(column.getFilterValue() as string) ?? ''}
              onChange={event => column.setFilterValue(event.target.value)}
              className="h-8 w-40 lg:w-56"
            />
          )

        case 'number':
          return (
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={columnMeta.placeholder ?? columnMeta.label}
                value={(column.getFilterValue() as string) ?? ''}
                onChange={event => column.setFilterValue(event.target.value)}
                className={cn('h-8 w-[120px]', columnMeta.unit && 'pr-8')}
              />
              {columnMeta.unit && (
                <span className="bg-accent text-muted-foreground absolute top-0 right-0 bottom-0 flex items-center rounded-r-md px-2 text-sm">
                  {columnMeta.unit}
                </span>
              )}
            </div>
          )

        case 'range':
          return <DataTableSliderFilter column={column} title={columnMeta.label ?? column.id} />

        case 'date':
        case 'dateRange':
          return (
            <DataTableDateFilter
              column={column}
              title={columnMeta.label ?? column.id}
              multiple={columnMeta.variant === 'dateRange'}
            />
          )

        case 'select':
        case 'multiSelect':
          return (
            <DataTableFacetedFilter
              column={column}
              title={columnMeta.label ?? column.id}
              options={columnMeta.options ?? []}
              multiple={columnMeta.variant === 'multiSelect'}
            />
          )

        default:
          return null
      }
    }, [column, columnMeta])

    return onFilterRender()
  }
}
