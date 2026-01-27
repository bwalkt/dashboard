import { type FetchNextPageOptions, FetchPreviousPageOptions, RefetchOptions } from '@tanstack/react-query'
import type {
  ColumnDef,
  ColumnFiltersState,
  Row,
  RowSelectionState,
  SortingState,
  TableOptions,
  Table as TTable,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getSortedRowModel,
  getFacetedMinMaxValues as getTTableFacetedMinMaxValues,
  getFacetedUniqueValues as getTTableFacetedUniqueValues,
  useReactTable,
} from '@tanstack/react-table'
import { LoaderCircle } from 'lucide-react'
import { type ParserBuilder, useQueryStates } from 'nuqs'
import * as React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/custom/table'
import { DataTableFilterCommand } from '@/components/data-table/data-table-filter-command'
import { DataTableProvider } from '@/components/data-table/data-table-provider'
import { MemoizedDataTableSheetContent } from '@/components/data-table/data-table-sheet/data-table-sheet-content'
import { DataTableSheetDetails } from '@/components/data-table/data-table-sheet/data-table-sheet-details'
import { DataTableToolbarInfinite } from '@/components/data-table/data-table-toolbar-infinite'
import type { DataTableFilterField, SheetField } from '@/components/data-table/types'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { useHotKey } from '@/hooks/use-hot-key'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { formatCompactNumber } from '@/lib/format'
import { arrSome, inDateRange } from '@/lib/table/filterfns'
import { cn } from '@/lib/utils'
import { LiveButton } from './live-button'
import { RefreshButton } from './refresh-button'
import { TimelineChart } from './timeline-chart'
import type { BaseChartSchema } from './types'

// TODO: add a possible chartGroupBy
export interface DataTableInfiniteProps<TData, TValue, TMeta> {
  title?: string
  description?: string
  columns: ColumnDef<TData, TValue>[]
  getRowClassName?: (row: Row<TData>) => string
  // REMINDER: make sure to pass the correct id to access the rows
  getRowId?: TableOptions<TData>['getRowId']
  data: TData[]
  defaultColumnFilters?: ColumnFiltersState
  defaultColumnSorting?: SortingState
  defaultRowSelection?: RowSelectionState
  defaultColumnVisibility?: VisibilityState
  filterFields?: DataTableFilterField<TData>[]
  sheetFields?: SheetField<TData, TMeta>[]
  // REMINDER: close to the same signature as the `getFacetedUniqueValues` of the `useReactTable`
  getFacetedUniqueValues?: (table: TTable<TData>, columnId: string) => Map<string, number>
  getFacetedMinMaxValues?: (table: TTable<TData>, columnId: string) => undefined | [number, number]
  totalRows?: number
  filterRows?: number
  totalRowsFetched?: number
  meta: TMeta
  chartData?: BaseChartSchema[]
  chartDataColumnId: string
  chartConfig?: import('@/components/ui/chart').ChartConfig
  chartBarKeys?: string[]
  isFetching?: boolean
  isLoading?: boolean
  hasNextPage?: boolean
  fetchNextPage: (options?: FetchNextPageOptions | undefined) => Promise<unknown>
  fetchPreviousPage?: (options?: FetchPreviousPageOptions | undefined) => Promise<unknown>
  refetch: (options?: RefetchOptions | undefined) => void
  renderLiveRow?: (props?: { row: Row<TData> }) => React.ReactNode
  renderSheetTitle: (props: { row?: Row<TData> }) => React.ReactNode
  // TODO:
  renderChart?: () => React.ReactNode
  searchParamsParser: Record<string, ParserBuilder<any>>
}

export function DataTableInfinite<TData, TValue, TMeta>({
  title,
  description,
  columns,
  getRowClassName,
  getRowId,
  data,
  defaultColumnFilters = [],
  defaultColumnSorting = [],
  defaultRowSelection = {},
  defaultColumnVisibility = {},
  filterFields = [],
  sheetFields = [],
  isFetching,
  isLoading,
  fetchNextPage,
  hasNextPage,
  fetchPreviousPage,
  refetch,
  totalRows = 0,
  filterRows = 0,
  totalRowsFetched = 0,
  chartData = [],
  chartDataColumnId,
  chartConfig,
  chartBarKeys,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  meta,
  renderLiveRow,
  renderSheetTitle,
  searchParamsParser,
}: DataTableInfiniteProps<TData, TValue, TMeta>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(defaultColumnFilters)
  const [sorting, setSorting] = React.useState<SortingState>(defaultColumnSorting)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(defaultRowSelection)

  // Sync columnFilters state with defaultColumnFilters prop (from URL)
  React.useEffect(() => {
    setColumnFilters(defaultColumnFilters)
  }, [defaultColumnFilters])
  const [columnOrder, setColumnOrder] = useLocalStorage<string[]>('data-table-column-order', [])
  const [columnVisibility, setColumnVisibility] = useLocalStorage<VisibilityState>(
    'data-table-visibility',
    defaultColumnVisibility,
  )
  const topBarRef = React.useRef<HTMLDivElement>(null)
  const tableRef = React.useRef<HTMLTableElement>(null)
  const [topBarHeight, setTopBarHeight] = React.useState(0)
  // FIXME: searchParamsParser needs to be passed as property
  const [_, setSearch] = useQueryStates(searchParamsParser)
  const onScroll = React.useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const onPageBottom =
        Math.ceil(e.currentTarget.scrollTop + e.currentTarget.clientHeight) >= e.currentTarget.scrollHeight

      if (onPageBottom && !isFetching && hasNextPage && totalRowsFetched < filterRows) {
        fetchNextPage()
      }
    },
    [fetchNextPage, isFetching, hasNextPage, filterRows, totalRowsFetched],
  )

  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      const rect = topBarRef.current?.getBoundingClientRect()
      if (rect) {
        setTopBarHeight(rect.height)
      }
    })

    const topBar = topBarRef.current
    if (!topBar) return

    observer.observe(topBar)
    return () => observer.unobserve(topBar)
  }, [topBarRef])

  // Disable client-side filtering - we only use server-side filtering
  // Keep columnFilters state for UI purposes (to show filter values in the UI)
  // but don't apply them to the table data
  // Filter out any null/undefined entries to prevent getRowId errors
  const validData = React.useMemo(() => {
    return data.filter((row): row is TData => row != null && typeof row === 'object')
  }, [data])

  const table = useReactTable({
    data: validData,
    columns,
    state: {
      columnFilters, // Track filter state for UI (server-side filtering handles actual data)
      sorting,
      columnVisibility,
      rowSelection,
      columnOrder,
    },
    enableMultiRowSelection: false,
    columnResizeMode: 'onChange',
    getRowId,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters, // Still update state for UI, but don't use for filtering
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    // Removed getFilteredRowModel - no client-side filtering
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getTTableFacetedUniqueValues(),
    getFacetedMinMaxValues: getTTableFacetedMinMaxValues(),
    filterFns: { inDateRange, arrSome },
    debugAll: import.meta.env.VITE_TABLE_DEBUG === 'true',
    meta: { getRowClassName },
  })

  React.useEffect(() => {
    const columnFiltersWithNullable = filterFields.map(field => {
      const filterValue = columnFilters.find(filter => filter.id === field.value)
      if (!filterValue) return { id: field.value, value: null }
      return { id: field.value, value: filterValue.value }
    })

    console.log('🔍 columnFilters:', columnFilters)
    console.log('🔍 columnFiltersWithNullable:', columnFiltersWithNullable)

    const search = columnFiltersWithNullable.reduce(
      (prev, curr) => {
        // Special handling for timerange filter - convert to startTime/endTime
        if (curr.id === 'date' && Array.isArray(curr.value) && curr.value.length >= 2) {
          const dates = curr.value as Date[]
          console.log('🔍 Date filter (2 dates):', dates)
          if (dates[0] && dates[1]) {
            prev.startTime = dates[0].getTime()
            prev.endTime = dates[1].getTime()
            console.log('🔍 Converted to startTime/endTime:', prev.startTime, prev.endTime)
          }
        } else if (curr.id === 'date' && Array.isArray(curr.value) && curr.value.length === 1) {
          const date = curr.value[0] as Date
          console.log('🔍 Date filter (1 date):', date)
          if (date) {
            prev.startTime = date.getTime()
            prev.endTime = date.getTime()
          }
        } else if (curr.id === 'name' && Array.isArray(curr.value)) {
          // Extract HTTP method from name values (e.g., "HTTP POST" -> "POST")
          const methods = (curr.value as string[])
            .map(val => {
              if (typeof val === 'string' && val.startsWith('HTTP ')) {
                return val.replace('HTTP ', '') as string
              }
              return val as string
            })
            .filter(Boolean)
          if (methods.length > 0) {
            prev.httpMethod = methods[0] // API expects single method, take first
          }
        } else if (curr.id !== 'date' && curr.id !== 'name') {
          // For other filters, add them normally
          prev[curr.id as string] = curr.value
        }
        return prev
      },
      {} as Record<string, unknown>,
    )

    setSearch(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters])

  React.useEffect(() => {
    setSearch({ sort: sorting?.[0] || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting])

  const selectedRow = React.useMemo(() => {
    if ((isLoading || isFetching) && !data.length) return
    const selectedRowKey = Object.keys(rowSelection)?.[0]
    return table.getCoreRowModel().flatRows.find(row => row.id === selectedRowKey)
  }, [rowSelection, table, isLoading, isFetching, data])

  // TODO: can only share uuid within the first batch
  React.useEffect(() => {
    if (isLoading || isFetching) return
    if (Object.keys(rowSelection)?.length && !selectedRow) {
      setSearch({ uuid: null })
      setRowSelection({})
    } else {
      setSearch({ uuid: Object.keys(rowSelection)?.[0] || null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection, selectedRow, isLoading, isFetching])

  /**
   * https://tanstack.com/table/v8/docs/guide/column-sizing#advanced-column-resizing-performance
   * Instead of calling `column.getSize()` on every render for every header
   * and especially every data cell (very expensive),
   * we will calculate all column sizes at once at the root table level in a useMemo
   * and pass the column sizes down as CSS variables to the <table> element.
   */
  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: { [key: string]: string } = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!
      // REMINDER: replace "." with "-" to avoid invalid CSS variable name (e.g. "timing.dns" -> "timing-dns")
      colSizes[`--header-${header.id.replace('.', '-')}-size`] = `${header.getSize()}px`
      colSizes[`--col-${header.column.id.replace('.', '-')}-size`] = `${header.column.getSize()}px`
    }
    return colSizes
  }, [table.getState().columnSizingInfo, table.getState().columnSizing, table.getState().columnVisibility])

  useHotKey(() => {
    setColumnOrder([])
    setColumnVisibility(defaultColumnVisibility)
  }, 'u')

  return (
    <DataTableProvider
      table={table}
      columns={columns}
      filterFields={filterFields}
      columnFilters={columnFilters}
      sorting={sorting}
      rowSelection={rowSelection}
      columnOrder={columnOrder}
      columnVisibility={columnVisibility}
      enableColumnOrdering={true}
      isLoading={isFetching || isLoading}
      getFacetedUniqueValues={getFacetedUniqueValues}
      getFacetedMinMaxValues={getFacetedMinMaxValues}
    >
      <AppLayout
        title={title}
        description={description}
        hasFilters={filterFields.length > 0}
        style={
          {
            '--top-bar-height': `${topBarHeight}px`,
            ...columnSizeVars,
          } as React.CSSProperties
        }
      >
        <div className="flex max-w-full flex-1 flex-col">
          <div ref={topBarRef} className={cn('flex flex-col gap-4 bg-background p-2', 'sticky top-0 z-10 pb-4')}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <DataTableFilterCommand searchParamsParser={searchParamsParser} />
              </div>
            </div>
            {/* TBD: better flexibility with compound components? */}
            <DataTableToolbarInfinite
              searchParamsParser={searchParamsParser}
              renderActions={() => [
                <RefreshButton key="refresh" onClick={refetch} />,
                fetchPreviousPage ? (
                  <LiveButton
                    key="live"
                    fetchPreviousPage={fetchPreviousPage}
                    searchParamsParser={searchParamsParser}
                    dateColumnId={chartDataColumnId}
                  />
                ) : null,
              ]}
            />
            {/* TODO: move up to client component */}
            <TimelineChart
              data={chartData}
              className="-mb-2"
              columnId={chartDataColumnId}
              chartConfig={chartConfig}
              barKeys={chartBarKeys}
            />
          </div>
          <div className="z-0">
            <Table
              ref={tableRef}
              onScroll={onScroll}
              // REMINDER: https://stackoverflow.com/questions/50361698/border-style-do-not-work-with-sticky-position-element
              className="border-separate border-spacing-0"
              containerClassName="max-h-[calc(100vh_-_var(--top-bar-height))]"
            >
              <TableHeader className={cn('sticky top-0 z-20 bg-background')}>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow
                    key={headerGroup.id}
                    className={cn('bg-muted/50 hover:bg-muted/50', '[&>*]:border-t [&>:not(:last-child)]:border-r')}
                  >
                    {headerGroup.headers
                      .filter(header => header.column.getIsVisible())
                      .map(header => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            'relative select-none truncate border-b border-border [&>.cursor-col-resize]:last:opacity-0',
                            header.column.columnDef.meta?.headerClassName,
                          )}
                          aria-sort={
                            header.column.getIsSorted() === 'asc'
                              ? 'ascending'
                              : header.column.getIsSorted() === 'desc'
                                ? 'descending'
                                : 'none'
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanResize() && (
                            <div
                              onDoubleClick={() => header.column.resetSize()}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={cn(
                                'user-select-none absolute -right-2 top-0 z-10 flex h-full w-4 cursor-col-resize touch-none justify-center',
                                'before:absolute before:inset-y-0 before:w-px before:translate-x-px before:bg-border',
                              )}
                            />
                          )}
                        </TableHead>
                      ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody
                id="content"
                tabIndex={-1}
                className="outline-1 -outline-offset-1 outline-primary transition-colors focus-visible:outline"
                // REMINDER: avoids scroll (skipping the table header) when using skip to content
                style={{
                  scrollMarginTop: 'calc(var(--top-bar-height) + 40px)',
                }}
              >
                {(() => {
                  // Use core row model directly since we disabled client-side filtering
                  const rows = table.getCoreRowModel().rows

                  return rows?.length ? (
                    rows.map(row => (
                      // REMINDER: if we want to add arrow navigation https://github.com/TanStack/table/discussions/2752#discussioncomment-192558
                      <React.Fragment key={row.id}>
                        {renderLiveRow?.({ row })}
                        <MemoizedRow row={row} table={table} selected={row.getIsSelected()} />
                      </React.Fragment>
                    ))
                  ) : (
                    <React.Fragment>
                      {renderLiveRow?.()}
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No results.
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                })()}
                <TableRow className="hover:bg-transparent data-[state=selected]:bg-transparent">
                  <TableCell colSpan={columns.length} className="text-center">
                    {hasNextPage || isFetching || isLoading ? (
                      <Button
                        disabled={isFetching || isLoading}
                        onClick={() => fetchNextPage()}
                        size="sm"
                        variant="outline"
                      >
                        {isFetching ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Load More
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No more data to load (
                        <span className="font-mono font-medium">{formatCompactNumber(filterRows)}</span> of{' '}
                        <span className="font-mono font-medium">{formatCompactNumber(totalRows)}</span> rows)
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </AppLayout>
      <DataTableSheetDetails title={renderSheetTitle({ row: selectedRow })} titleClassName="font-mono">
        <MemoizedDataTableSheetContent
          table={table}
          data={selectedRow?.original}
          filterFields={filterFields}
          fields={sheetFields}
          // TODO: check if we should memoize this
          // REMINDER: this is used to pass additional data like the `InfiniteQueryMeta`
          metadata={{
            totalRows,
            filterRows,
            totalRowsFetched,
            // REMINDER: includes `currentPercentiles`
            ...meta,
          }}
        />
      </DataTableSheetDetails>
    </DataTableProvider>
  )
}

/**
 * REMINDER: this is the heaviest component in the table if lots of rows
 * Some other components are rendered more often necessary, but are fixed size (not like rows that can grow in height)
 * e.g. DataTableFilterControls, DataTableFilterCommand, DataTableToolbar, DataTableHeader
 */

function Row<TData>({
  row,
  table,
  selected,
}: {
  row: Row<TData>
  table: TTable<TData>
  // REMINDER: row.getIsSelected(); - just for memoization
  selected?: boolean
}) {
  return (
    <TableRow
      id={row.id}
      tabIndex={0}
      data-state={selected && 'selected'}
      onClick={() => row.toggleSelected()}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          row.toggleSelected()
        }
      }}
      className={cn(
        '[&>:not(:last-child)]:border-r',
        'outline-1 -outline-offset-1 outline-primary transition-colors focus-visible:bg-muted/50 focus-visible:outline data-[state=selected]:outline',
        (table.options.meta as { getRowClassName?: (row: Row<TData>) => string })?.getRowClassName?.(row),
      )}
    >
      {row.getVisibleCells().map(cell => (
        <TableCell
          key={cell.id}
          className={cn('truncate px-2 border-b border-border', cell.column.columnDef.meta?.cellClassName)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

const MemoizedRow = React.memo(Row, (prev, next) => {
  // Re-render if row ID or selection changes
  if (prev.row.id !== next.row.id || prev.selected !== next.selected) {
    return false
  }
  // Also re-render if column visibility changes (check visible cells count)
  const prevVisibleCount = prev.row.getVisibleCells().length
  const nextVisibleCount = next.row.getVisibleCells().length
  if (prevVisibleCount !== nextVisibleCount) {
    return false
  }
  return true
}) as typeof Row
