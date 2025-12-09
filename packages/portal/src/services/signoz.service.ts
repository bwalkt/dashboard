/**
 * SigNoz API Service
 * Client-side service that calls the server API endpoints for SigNoz queries
 */

import type { RawDataResponse, SigNozQueryOptions } from '@pzero/shared/types'
import { apiRequest } from '@/lib/api'

/**
 * Query SigNoz API for traces via server endpoint
 */
export async function queryTraces(options: SigNozQueryOptions): Promise<RawDataResponse> {
  return apiRequest<RawDataResponse>('/signoz/traces', {
    method: 'POST',
    body: options,
  })
}

/**
 * Get available service names (for autocomplete)
 * This is a placeholder - you may need to implement a separate API call
 * or fetch from a different endpoint depending on your SigNoz setup
 */
export async function getServiceNames(): Promise<string[]> {
  // This would typically call a different SigNoz endpoint to get available services
  // For now, return empty array - can be enhanced later
  return []
}
