import type { RawDataResponse, SigNozFilters, SigNozPagination } from '@pzero/shared/types'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { queryTraces, queryTracesSummary } from '@/services/signoz.service'
import type { SignozTraceSchema } from './schema'
import { type SearchParamsType, searchParamsSerializer } from './search-params'

/**
 * Transform RawDataResponse to SignozTraceSchema format
 */
function transformTraceData(rawData: RawDataResponse['data']): SignozTraceSchema[] {
  if (!rawData) return []

  return rawData.map(item => {
    // Parse timestamp - can be string (ISO) or number (epoch)
    let timestamp: number
    if (typeof item.timestamp === 'string') {
      timestamp = new Date(item.timestamp).getTime()
    } else if (typeof item.timestamp === 'number') {
      timestamp = item.timestamp
    } else {
      timestamp = Date.now()
    }

    // Convert responseStatusCode from string to number if needed
    let responseStatusCode: number | undefined
    if (item.responseStatusCode !== undefined && item.responseStatusCode !== null) {
      responseStatusCode =
        typeof item.responseStatusCode === 'string' ? parseInt(item.responseStatusCode, 10) : item.responseStatusCode
    }

    return {
      ...item,
      timestamp,
      date: new Date(timestamp),
      responseStatusCode,
    } as SignozTraceSchema
  })
}

/**
 * Build SigNoz filters from search params
 */
function buildSignozFilters(search: SearchParamsType): SigNozFilters {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  // Helper to convert array or single value to the appropriate type
  const getArrayOrValue = <T>(value: T | T[] | null | undefined): T | T[] | undefined => {
    if (value === null || value === undefined) return undefined
    return value
  }

  // Helper to convert slider range (array of 2 numbers) or single number
  const getSliderValue = (value: number[] | number | null | undefined): number | [number, number] | undefined => {
    if (value === null || value === undefined) return undefined
    if (Array.isArray(value) && value.length === 2) {
      return [value[0], value[1]] as [number, number]
    }
    if (typeof value === 'number') {
      return value
    }
    return undefined
  }

  const timingPhases = {
    dns: getSliderValue(search['timingPhases.dns']),
    connection: getSliderValue(search['timingPhases.connection']),
    tls: getSliderValue(search['timingPhases.tls']),
    ttfb: getSliderValue(search['timingPhases.ttfb']),
    transfer: getSliderValue(search['timingPhases.transfer']),
  }
  const hasTimingPhases = Object.values(timingPhases).some(v => v !== undefined)

  return {
    serviceName: search.serviceName || undefined,
    httpMethod: getArrayOrValue(search.http_method),
    http_host: search.http_host || undefined,
    http_url: search.http_url || undefined,
    responseStatusCode: getArrayOrValue(search.responseStatusCode),
    durationMs: getSliderValue(search.durationMs),
    timingPhases: hasTimingPhases ? timingPhases : undefined,
    startTime: search.startTime || oneHourAgo,
    endTime: search.endTime || now,
  }
}

/**
 * Query options for Signoz traces
 */
export const dataOptions = (search: SearchParamsType) => {
  const DEFAULT_LIMIT = search.limit || 50

  return infiniteQueryOptions({
    queryKey: ['signoz-traces', searchParamsSerializer({ ...search, offset: null, traceId: null })], // Remove offset and traceId from queryKey to avoid unnecessary refetches
    queryFn: async ({
      pageParam = 0,
    }): Promise<{
      data: {
        traces: SignozTraceSchema[]
        // summary: BaseChartSchema[];
      }
      total: number
      limit: number
      offset: number
    }> => {
      const filters = buildSignozFilters(search)
      const pagination: SigNozPagination = {
        limit: DEFAULT_LIMIT,
        offset: pageParam as number,
      }

      const response = await queryTraces({ filters, pagination })

      const transformedData = transformTraceData(response.data)

      // const summaryData = transformTraceDataToSummary(transformedData);

      return {
        data: {
          traces: transformedData,
          // summary: summaryData
        },
        total: response.total || 0,
        limit: response.limit || pagination.limit,
        offset: response.offset || pagination.offset,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages) => {
      const currentOffset = lastPage.offset
      const limit = lastPage.limit
      const total = lastPage.total
      const nextOffset = currentOffset + limit

      // If we've fetched all data, return null to stop pagination
      if (nextOffset >= total) {
        return null
      }

      return nextOffset
    },
    refetchOnWindowFocus: false,
    enabled: Boolean(search.startTime && search.endTime), // Only run query when time range is set
    // placeholderData: keepPreviousData,
  })
}

/**
 * Transform raw response data to summary by date or hour
 * Groups by hour if all data is within 24 hours, otherwise groups by date
 */
function transformTraceDataToSummary(
  rawData: RawDataResponse['data'],
): { timestamp: number; success: number; warning: number; error: number }[] {
  if (!rawData || !Array.isArray(rawData)) return []

  // Helper: get the numeric status safely from any possible field name: status, http_status, responseStatusCode
  function getStatus(item: any): number | undefined {
    // Try various typical field names
    if (typeof item.http_status === 'number') return item.http_status
    if (typeof item.http_status === 'string') return parseInt(item.http_status, 10)
    if (typeof item.status === 'number') return item.status
    if (typeof item.status === 'string') return parseInt(item.status, 10)
    if (typeof item.responseStatusCode === 'number') return item.responseStatusCode
    if (typeof item.responseStatusCode === 'string') return parseInt(item.responseStatusCode, 10)
    return undefined
  }

  // Helper: parse timestamp from item
  function parseTimestamp(item: any): number {
    if (typeof item.timestamp === 'string') {
      return new Date(item.timestamp).getTime()
    } else if (typeof item.timestamp === 'number') {
      return item.timestamp
    } else {
      return Date.now()
    }
  }

  // Check if all data is within 24 hours
  const timestamps = rawData.map(parseTimestamp)
  const minTimestamp = Math.min(...timestamps)
  const maxTimestamp = Math.max(...timestamps)
  const timeRange = maxTimestamp - minTimestamp
  const twentyFourHours = 24 * 60 * 60 * 1000
  const groupByHour = timeRange <= twentyFourHours

  // Group by date (YYYY-MM-DD) or hour (YYYY-MM-DDTHH)
  const groupMap = new Map<string, { timestamp: number; success: number; warning: number; error: number }>()
  for (const item of rawData) {
    const timestamp = parseTimestamp(item)
    const date = new Date(timestamp)

    let groupKey: string
    let groupTimestamp: number

    if (groupByHour) {
      // Group by hour: YYYY-MM-DDTHH
      const hourStr = date.toISOString().slice(0, 13) // 'YYYY-MM-DDTHH'
      groupKey = hourStr
      // Get start of hour timestamp in UTC
      groupTimestamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours())
    } else {
      // Group by date: YYYY-MM-DD
      const dayStr = date.toISOString().slice(0, 10) // 'YYYY-MM-DD'
      groupKey = dayStr
      // Get midnight timestamp of the day in UTC
      groupTimestamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    }

    // Determine bucket
    let bucket = groupMap.get(groupKey)
    if (!bucket) {
      bucket = {
        timestamp: groupTimestamp,
        success: 0,
        warning: 0,
        error: 0,
      }
      groupMap.set(groupKey, bucket)
    }

    const status = getStatus(item)
    if (typeof status === 'number') {
      if (status >= 200 && status < 400) {
        bucket.success += 1
      } else if (status >= 400 && status < 500) {
        bucket.warning += 1
      } else if (status >= 500) {
        bucket.error += 1
      }
    }
  }

  // Sort by timestamp ascending
  return Array.from(groupMap.values()).sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Query options for Signoz traces summary
 */
export const summaryOptions = () => {
  return queryOptions({
    queryKey: ['signoz-traces-summary'],
    queryFn: async (): Promise<{ timestamp: number; success: number; warning: number; error: number }[]> => {
      const response = await queryTracesSummary()
      const transformedData = transformTraceDataToSummary(response.data || [])
      return transformedData
    },
    refetchOnWindowFocus: false,
  })
}
