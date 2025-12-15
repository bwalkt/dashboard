'use client'

import type { RawDataResponse, SigNozFilters, SigNozPagination } from '@pzero/shared/types'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { SignozFilters } from '@/components/signoz/SignozFilters'
import { SignozResultsTable } from '@/components/signoz/SignozResultsTable'
import { queryTraces } from '@/services/signoz.service'

const DEFAULT_LIMIT = 50

export function SignozTracesPage() {
  const [filters, setFilters] = React.useState<SigNozFilters>(() => {
    // Default to last 1 hour with sfdc-example service
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    return {
      serviceName: 'sfdc-example',
      startTime: oneHourAgo,
      endTime: now,
    }
  })

  const [pagination, setPagination] = React.useState<SigNozPagination>({
    limit: DEFAULT_LIMIT,
    offset: 0,
  })

  const [allData, setAllData] = React.useState<RawDataResponse | undefined>(undefined)
  const [isQuerying, setIsQuerying] = React.useState(false)
  const [hasInitialQuery, setHasInitialQuery] = React.useState(false)

  // Query function
  const queryFn = React.useCallback(async () => {
    return queryTraces({
      filters,
      pagination,
    })
  }, [filters, pagination])

  // Use React Query for data fetching
  const { data, error, refetch, isFetching } = useQuery<RawDataResponse>({
    queryKey: ['signoz-traces', filters, pagination],
    queryFn,
    retry: 1,
  })

  // Handle query button click
  const handleQuery = React.useCallback(() => {
    setIsQuerying(true)
    setPagination({ limit: DEFAULT_LIMIT, offset: 0 })
    setAllData(undefined)
    setHasInitialQuery(true)
    refetch().finally(() => {
      setIsQuerying(false)
    })
  }, [refetch])

  // Update allData when new data arrives
  React.useEffect(() => {
    if (data) {
      if (pagination.offset === 0) {
        // First page - replace data
        setAllData(data)
      } else {
        // Subsequent pages - append data
        // Preserve metadata from existing aggregated state (or from first page)
        // Only concatenate the data array
        setAllData(prev => ({
          total: prev?.total ?? data.total,
          limit: prev?.limit ?? data.limit,
          offset: prev?.offset ?? data.offset,
          data: [...(prev?.data || []), ...(data.data || [])],
        }))
      }
    }
  }, [data, pagination.offset])

  // Handle load more - trigger refetch when offset changes (only if initial query was made)
  React.useEffect(() => {
    if (hasInitialQuery && pagination.offset > 0) {
      refetch()
    }
  }, [pagination.offset, hasInitialQuery, refetch])

  // Handle load more button click
  const handleLoadMore = React.useCallback(() => {
    const newOffset = pagination.offset + pagination.limit
    setPagination(prev => ({
      ...prev,
      offset: newOffset,
    }))
  }, [pagination.offset, pagination.limit])

  // Check if there's more data to load
  const hasMore = React.useMemo(() => {
    if (!allData || !data) return false
    const currentCount = allData.data?.length || 0
    const total = data.total || currentCount
    return currentCount < total
  }, [allData, data])

  return (
    <div className="space-y-6">
      <SignozFilters
        filters={filters}
        onFiltersChange={setFilters}
        onQuery={handleQuery}
        isLoading={isQuerying || isFetching}
      />

      <SignozResultsTable
        data={allData}
        isLoading={isQuerying && pagination.offset === 0}
        error={error as Error | null}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        isLoadingMore={isFetching && pagination.offset > 0}
      />
    </div>
  )
}
