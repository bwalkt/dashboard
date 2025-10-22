import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import type * as React from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTablePagination } from '@/components/ui/table/data-table-pagination'
import { getCommonPinningStyles } from '@/lib/data-table'

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>
  actionBar?: React.ReactNode
}

/**
 * Render a scrollable, pinnable data table with header groups, row rendering, pagination, and an optional action bar.
 *
 * @param table - The TanStack Table instance that provides header groups, row models, selection state, and pagination.
 * @param actionBar - Optional node rendered next to pagination when there is at least one filtered selected row.
 * @param children - Optional content rendered above the table (e.g., filters or controls).
 * @returns A responsive table layout containing sticky headers with per-column pinning, table rows (or an empty-state message), a horizontal scrollbar, pagination controls, and an optional action bar when rows are selected.
 */
export function DataTable<TData>({ table, actionBar, children }: DataTableProps<TData>) {
  return (
    <div className="flex flex-col space-y-4 min-h-[600px]">
      {children}
      <div className="relative flex-1 min-h-[400px]">
        <div className="absolute inset-0 flex overflow-hidden rounded-lg border">
          <ScrollArea className="h-full w-full">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{
                          ...getCommonPinningStyles({ column: header.column }),
                        }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          style={{
                            ...getCommonPinningStyles({ column: cell.column }),
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  )
}
