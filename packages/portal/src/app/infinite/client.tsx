import { useQuery } from '@tanstack/react-query'
import { useQueryStates } from 'nuqs'
import * as React from 'react'
import { useHotKey } from '@/hooks/use-hot-key'
import { columns } from './columns'
import { filterFields as defaultFilterFields, sheetFields } from './constants'
import { DataTableInfinite } from './data-table-infinite'
import { dataOptions } from './query-options'
import type { SignozTraceSchema } from './schema'
import { searchParamsParser } from './search-params'

const DEFAULT_LIMIT = 50

export function Client() {
  const [search, setSearch] = useQueryStates(searchParamsParser)
  useResetFocus()

  // Initialize default time range if not set
  React.useEffect(() => {
    if (!search.startTime || !search.endTime) {
      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000
      setSearch({
        startTime: oneHourAgo,
        endTime: now,
      })
    }
  }, [search.startTime, search.endTime, setSearch])

  // State for accumulated data across pages
  const [allData, setAllData] = React.useState<SignozTraceSchema[]>([])
  const [totalCount, setTotalCount] = React.useState<number>(0)
  const [hasInitialQuery, setHasInitialQuery] = React.useState(false)

  // Query current page
  const { data, isFetching, isLoading, refetch } = useQuery(dataOptions(search))

  // Mark as having initial query when data first arrives
  React.useEffect(() => {
    if (data && !hasInitialQuery) {
      setHasInitialQuery(true)
    }
  }, [data, hasInitialQuery])

  // Update accumulated data when new data arrives
  React.useEffect(() => {
    if (data && data.data) {
      console.log('Setting allData:', {
        dataLength: data.data.length,
        total: data.total,
        offset: search.offset,
        firstItem: data.data[0],
      })
      if (search.offset === 0) {
        // First page - replace data
        setAllData(data.data)
        setTotalCount(data.total)
      } else {
        // Subsequent pages - append data with deduplication
        setAllData(prev => {
          // Create a Set of existing trace_ids for fast lookup
          const existingIds = new Set(prev.map(row => row.trace_id))
          // Filter out duplicates from new data
          const newData = data.data.filter(row => !existingIds.has(row.trace_id))
          console.log('Appending data:', {
            prevLength: prev.length,
            newDataLength: data.data.length,
            uniqueNewDataLength: newData.length,
            duplicates: data.data.length - newData.length,
          })
          return [...prev, ...newData]
        })
        setTotalCount(data.total)
      }
    } else {
      console.log('No data to set:', { data, hasData: !!data, hasDataData: !!(data && data.data) })
    }
  }, [data, search.offset])

  // Debug: log allData changes
  React.useEffect(() => {
    console.log('allData updated:', { length: allData.length, totalCount, firstItem: allData[0] })
  }, [allData, totalCount])

  // Handle load more - trigger refetch when offset changes (only if initial query was made)
  React.useEffect(() => {
    if (hasInitialQuery && search.offset > 0) {
      refetch()
    }
  }, [search.offset, hasInitialQuery, refetch])

  // Refetch when timerange (startTime/endTime) changes
  React.useEffect(() => {
    if (hasInitialQuery && search.startTime && search.endTime) {
      // Reset offset to 0 when timerange changes
      setSearch(prev => ({
        ...prev,
        offset: 0,
      }))
      setAllData([])
      refetch()
    }
  }, [search.startTime, search.endTime, hasInitialQuery, refetch, setSearch])

  // Handle initial query or filter change
  const handleQuery = React.useCallback(() => {
    setSearch({
      ...search,
      offset: 0,
    })
    setAllData([])
    setHasInitialQuery(true)
    refetch()
  }, [search, setSearch, refetch])

  // Handle load more button click
  const handleLoadMore = React.useCallback(() => {
    const newOffset = (search.offset || 0) + (search.limit || DEFAULT_LIMIT)
    setSearch({
      ...search,
      offset: newOffset,
    })
  }, [search, setSearch])

  // Check if there's more data to load
  const hasMore = React.useMemo(() => {
    return allData.length < totalCount
  }, [allData.length, totalCount])

  // Extract filter values for defaultColumnFilters
  // Note: We don't add date filter here because we filter by startTime/endTime at the API level
  // Adding it as a column filter would cause double-filtering and might filter out all rows
  // Only include filters that correspond to actual table columns
  const { sort, traceId, httpMethod, serviceName } = search

  // Valid column IDs that exist in the table
  const validColumnIds = new Set(['date', 'trace_id', 'serviceName', 'name', 'durationMs', 'responseStatusCode'])

  const defaultColumnFilters = [
    // Map httpMethod to 'name' column filter (API uses httpMethod, but table filters 'name' column)
    ...(httpMethod
      ? [
          {
            id: 'name',
            value: [`HTTP ${httpMethod}`] as string[],
          },
        ]
      : []),
    // Add serviceName filter if it exists and is a valid column
    ...(serviceName && validColumnIds.has('serviceName')
      ? [
          {
            id: 'serviceName',
            value: serviceName,
          },
        ]
      : []),
  ]

  return (
    <DataTableInfinite
      title="Traces"
      description="Monitor and analyze distributed traces from SigNoz"
      columns={columns}
      data={allData.filter(
        (row): row is SignozTraceSchema => row != null && typeof row === 'object' && 'trace_id' in row,
      )}
      totalRows={totalCount}
      filterRows={totalCount}
      totalRowsFetched={allData.length}
      defaultColumnFilters={defaultColumnFilters}
      defaultColumnSorting={sort ? [sort] : undefined}
      defaultRowSelection={traceId ? { [traceId]: true } : undefined}
      defaultColumnVisibility={{}}
      meta={{}}
      filterFields={defaultFilterFields}
      sheetFields={sheetFields}
      isFetching={isFetching && search.offset > 0}
      isLoading={isLoading && search.offset === 0}
      fetchNextPage={async () => {
        handleLoadMore()
      }}
      hasNextPage={hasMore}
      fetchPreviousPage={undefined}
      refetch={handleQuery}
      chartData={[]}
      chartDataColumnId="date"
      getRowClassName={() => ''}
      getRowId={row => {
        if (!row) {
          console.error('getRowId called with undefined/null row')
          return `row-${Math.random()}`
        }
        const id = row.trace_id || row.span_id || `row-${Math.random()}`
        if (!row.trace_id) {
          console.warn('Row missing trace_id:', row)
        }
        return id
      }}
      getFacetedUniqueValues={() => new Map()}
      getFacetedMinMaxValues={() => undefined}
      renderLiveRow={() => null}
      renderSheetTitle={props => props.row?.original.name || 'Trace'}
      searchParamsParser={searchParamsParser}
    />
  )
}

function useResetFocus() {
  useHotKey(() => {
    // FIXME: some dedicated div[tabindex="0"] do not auto-unblur (e.g. the DataTableFilterResetButton)
    // REMINDER: we cannot just document.activeElement?.blur(); as the next tab will focus the next element in line,
    // which is not what we want. We want to reset entirely.
    document.body.setAttribute('tabindex', '0')
    document.body.focus()
    document.body.removeAttribute('tabindex')
  }, '.')
}
