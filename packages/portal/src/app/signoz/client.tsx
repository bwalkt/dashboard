import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { ColumnFiltersState } from '@tanstack/react-table'
import { useQueryStates } from 'nuqs'
import * as React from 'react'
import type { DataTableFilterField } from '@/components/data-table/types'
import { DataTableInfinite } from '@/components/infinite-data-table/data-table-infinite'
import type { ChartConfig } from '@/components/ui/chart'
import { useHotKey } from '@/hooks/use-hot-key'
import { columns } from './columns'
import { filterFields as defaultFilterFields, sheetFields } from './constants'
import { dataOptions, summaryOptions } from './query-options'
import type { SignozTraceSchema } from './schema'
import { searchParamsParser } from './search-params'

const chartConfig: ChartConfig = {
  success: {
    label: 'Success',
    color: 'hsl(142 76% 36%)',
  },
  warning: {
    label: 'Warning',
    color: 'hsl(45 93% 47%)',
  },
  error: {
    label: 'Error',
    color: 'hsl(0 84% 60%)',
  },
}

export function SignozClient() {
  const [search, setSearch] = useQueryStates(searchParamsParser)
  useResetFocus()

  const fallbackRange = React.useMemo(() => {
    const now = Date.now()
    return {
      start: now - 60 * 60 * 1000,
      end: now,
    }
  }, [])

  const rangeStartTime = search.startTime ?? fallbackRange.start
  const rangeEndTime = search.endTime ?? fallbackRange.end

  // Initialize default time range if not set
  React.useEffect(() => {
    if (!search.startTime || !search.endTime) {
      setSearch({
        startTime: fallbackRange.start,
        endTime: fallbackRange.end,
      })
    }
  }, [fallbackRange.end, fallbackRange.start, search.endTime, search.startTime, setSearch])

  // Use infinite query for pagination
  const { data, isFetching, isLoading, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery(dataOptions(search))
  // Flatten all pages into a single array
  const flatData = React.useMemo(() => {
    return data?.pages?.flatMap(page => page.data.traces ?? []) ?? []
  }, [data?.pages])

  // Use separate query for chart summary data (fetches all data for the date range)
  const { data: chartData = [] } = useQuery(summaryOptions(rangeStartTime, rangeEndTime))

  // Get metadata from the last page (all pages should have the same total)
  const lastPage = data?.pages?.[data?.pages.length - 1]
  const totalCount = lastPage?.total ?? 0
  const totalRowsFetched = flatData.length

  // Extract filter values for defaultColumnFilters
  // Exclude params that are not table columns (limit, offset, sort, spanId, traceId)
  // But convert startTime/endTime to a "date" column filter
  const {
    sort,
    spanId,
    traceId,
    startTime: searchStartTime,
    endTime: searchEndTime,
    limit,
    offset,
    ...filters
  } = search

  const defaultColumnFilters = React.useMemo<ColumnFiltersState>(() => {
    const columnFilters = Object.entries(filters)
      .map(([key, value]) => ({
        id: key,
        value,
      }))
      .filter(({ value }) => value != null && (!Array.isArray(value) || value.length > 0)) as ColumnFiltersState

    // Convert startTime/endTime URL params back to a "date" column filter
    if (searchStartTime && searchEndTime) {
      columnFilters.push({
        id: 'date',
        value: [new Date(searchStartTime), new Date(searchEndTime)],
      })
    }

    return columnFilters
  }, [filters, searchEndTime, searchStartTime])

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
      defaultRowSelection={spanId ? { [spanId]: true } : undefined}
      defaultColumnVisibility={{
        'timingPhases.dns': false,
        'timingPhases.connection': false,
        'timingPhases.tls': false,
        'timingPhases.ttfb': false,
        'timingPhases.transfer': false,
      }}
      meta={{}}
      filterFields={defaultFilterFields as DataTableFilterField<SignozTraceSchema>[]}
      sheetFields={sheetFields}
      isFetching={isFetching}
      isLoading={isLoading}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage ?? false}
      fetchPreviousPage={undefined}
      refetch={refetch}
      chartData={chartData}
      chartDataColumnId="date"
      chartConfig={chartConfig}
      chartBarKeys={['error', 'warning', 'success']}
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
