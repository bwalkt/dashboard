import type { ColumnDef, Table as TTable } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import { ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  type TablePadding,
  TableRow,
} from '@/components/custom/table'
import { cn } from '@/lib/utils'
import type { GroupByOption } from './data-table-group-by'
import { getGroupColor } from './group-color-utils'

interface GroupedTableProps<TData> {
  table: TTable<TData>
  columns: ColumnDef<TData, any>[]
  data: TData[]
  groupBy: keyof TData
  groupByOptions: GroupByOption<TData>[]
  cellPadding?: TablePadding
  headerPadding?: TablePadding
}

interface GroupedData<TData> {
  groupKey: string
  groupValue: any
  color?: string
  items: TData[]
}

export function DataTableGrouped<TData>({
  table,
  columns,
  data,
  groupBy,
  groupByOptions,
  cellPadding = 'none',
  headerPadding = 'sm',
}: GroupedTableProps<TData>) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set())

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }
  const filteredRows = table.getFilteredRowModel().rows

  const groupedData = React.useMemo(() => {
    const groups = new Map<string, TData[]>()

    // Group the filtered data
    filteredRows.forEach(row => {
      const value = row.getValue(groupBy as string)
      const key = String(value || 'No ' + String(groupBy))

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(row.original)
    })

    // Convert to array and add color information
    return Array.from(groups.entries()).map(([key, items]): GroupedData<TData> => {
      // Get the actual value from the first item for color determination
      const firstItem = items[0]
      const actualValue = firstItem ? (firstItem as any)[groupBy] : key

      return {
        groupKey: key,
        groupValue: key,
        color: getGroupColor(key, actualValue, String(groupBy)),
        items,
      }
    })
  }, [filteredRows, groupBy, groupByOptions])

  return (
    <div className="space-y-4">
      {groupedData.map(group => {
        const isCollapsed = collapsedGroups.has(group.groupKey)

        return (
          <div key={group.groupKey} className="rounded-md border overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.groupKey)}
              className={`flex w-full items-center gap-2 bg-muted/30 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                isCollapsed ? 'border-l-4' : ''
              }`}
              style={{
                borderLeftColor: isCollapsed ? group.color : undefined,
              }}
            >
              {isCollapsed ? (
                <ChevronDown className="h-5 w-5 stroke-[5]" style={{ color: group.color }} />
              ) : (
                <ChevronUp className="h-5 w-5 stroke-[5]" style={{ color: group.color }} />
              )}
              <h3 className="font-medium text-lg capitalize">
                {group.groupValue}&nbsp;&nbsp;&nbsp; {group.items.length} item{group.items.length !== 1 ? 's' : ''}
              </h3>
            </button>

            {/* Group Table - Collapsible */}
            {!isCollapsed && (
              <div className="border-l-4" style={{ borderLeftColor: group.color }}>
                <Table
                  className={`table-fixed table-resizable ${
                    table.getState().columnSizingInfo.isResizingColumn ? 'table-resizing' : ''
                  }`}
                  style={{
                    width: table.getCenterTotalSize(),
                  }}
                >
                  <TableHeader className="bg-muted/20 sticky top-0 z-10">
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow key={`${group.groupKey}-${headerGroup.id}`} className="hover:bg-transparent">
                        {headerGroup.headers.map(header => (
                          <TableHead
                            key={header.id}
                            padding={headerPadding}
                            style={{
                              width: header.getSize(),
                              position: 'relative',
                            }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={`resize-handle ${header.column.getIsResizing() ? 'resizing' : ''}`}
                              />
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item, index) => {
                      // Find the actual row from the table that matches this item
                      const actualRow = table.getFilteredRowModel().rows.find(row => row.original === item)

                      if (!actualRow) {
                        // Fallback for items that don't have proper row objects
                        const rowId = `${group.groupKey}-${index}`
                        return (
                          <TableRow key={rowId}>
                            {columns.map((column, colIndex) => {
                              const cellId = `${rowId}-${colIndex}`
                              return (
                                <TableCell
                                  key={cellId}
                                  padding={cellPadding}
                                  style={{
                                    width: table.getHeaderGroups()[0]?.headers[colIndex]?.getSize(),
                                  }}
                                >
                                  {column.accessorKey ? String((item as any)[column.accessorKey] || '') : ''}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      }

                      return (
                        <TableRow
                          key={actualRow.id}
                          data-state={actualRow.getIsSelected && actualRow.getIsSelected() ? 'selected' : undefined}
                        >
                          {actualRow.getVisibleCells().map(cell => (
                            <TableCell
                              key={cell.id}
                              padding={cellPadding}
                              style={{
                                width: cell.column.getSize(),
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })}
                    {group.items.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          padding={cellPadding}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No items in this group.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )
      })}

      {groupedData.length === 0 && (
        <div className="rounded-md border">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
