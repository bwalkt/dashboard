import { queryOptions } from '@tanstack/react-query'
import type { RawDataResponse, SigNozFilters, SigNozPagination } from '@pzero/shared/types'
import { queryTraces } from '@/services/signoz.service'
import type { SignozTraceSchema } from './schema'
import type { SearchParamsType } from './search-params'

export type SignozTraceMeta = Record<string, unknown>

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
      responseStatusCode = typeof item.responseStatusCode === 'string' 
        ? parseInt(item.responseStatusCode, 10) 
        : item.responseStatusCode
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
  
  return {
    serviceName: search.serviceName || undefined,
    httpMethod: search.httpMethod || undefined,
    startTime: search.startTime || oneHourAgo,
    endTime: search.endTime || now,
  }
}

/**
 * Build SigNoz pagination from search params
 */
function buildSignozPagination(search: SearchParamsType): SigNozPagination {
  return {
    limit: search.limit || 50,
    offset: search.offset || 0,
  }
}

/**
 * Query options for Signoz traces
 */
export const dataOptions = (search: SearchParamsType) => {
  return queryOptions({
    queryKey: ['signoz-traces', search],
    queryFn: async (): Promise<{ data: SignozTraceSchema[]; total: number; limit: number; offset: number }> => {
      const filters = buildSignozFilters(search)
      const pagination = buildSignozPagination(search)
      
      const response = await queryTraces({ filters, pagination })
      
      const transformedData = transformTraceData(response.data)
      
      console.log('Query response:', {
        rawDataLength: response.data?.length,
        transformedDataLength: transformedData.length,
        total: response.total,
        sampleItem: transformedData[0],
      })
      
      return {
        data: transformedData,
        total: response.total || 0,
        limit: response.limit || pagination.limit,
        offset: response.offset || pagination.offset,
      }
    },
    refetchOnWindowFocus: false,
    enabled: Boolean(search.startTime && search.endTime), // Only run query when time range is set
  })
}
