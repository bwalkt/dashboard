import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useQueryStates } from 'nuqs'
import * as React from 'react'
import { DataTableInfinite } from '@/components/infinite-data-table/data-table-infinite'
import { useHotKey } from '@/hooks/use-hot-key'
import { columns } from './columns'
import { filterFields as defaultFilterFields, sheetFields } from './constants'
import { dataOptions, summaryOptions } from './query-options'
import type { SignozTraceSchema } from './schema'
import { searchParamsParser } from './search-params'

export function SignozClient() {
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

  // Use infinite query for pagination
  const { data, isFetching, isLoading, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery(dataOptions(search))
  const { data: summaryData } = useQuery(summaryOptions())
  console.log('summaryData', summaryData)
  // Flatten all pages into a single array
  const flatData = React.useMemo(() => {
    return data?.pages?.flatMap(page => page.data ?? []) ?? []
  }, [data?.pages])

  // Get metadata from the last page (all pages should have the same total)
  const lastPage = data?.pages?.[data?.pages.length - 1]
  const totalCount = lastPage?.total ?? 0
  const totalRowsFetched = flatData.length

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
      data={flatData.filter(
        (row): row is SignozTraceSchema => row != null && typeof row === 'object' && 'trace_id' in row,
      )}
      totalRows={totalCount}
      filterRows={totalCount}
      totalRowsFetched={totalRowsFetched}
      defaultColumnFilters={defaultColumnFilters}
      defaultColumnSorting={sort ? [sort] : undefined}
      defaultRowSelection={traceId ? { [traceId]: true } : undefined}
      defaultColumnVisibility={{
        'timingPhases.dns': false,
        'timingPhases.connection': false,
        'timingPhases.tls': false,
        'timingPhases.ttfb': false,
        'timingPhases.transfer': false,
      }}
      meta={{}}
      filterFields={defaultFilterFields}
      sheetFields={sheetFields}
      isFetching={isFetching}
      isLoading={isLoading}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage ?? false}
      fetchPreviousPage={undefined}
      refetch={refetch}
      chartData={summaryData?.data ?? []}
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
