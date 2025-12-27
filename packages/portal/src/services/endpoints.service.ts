import { api } from '@/lib/api'
import type {
  CreateEndpointRequest,
  Endpoint,
  EndpointResponse,
  EndpointsResponse,
  RefreshCacheResponse,
  UpdateEndpointRequest,
} from '@/types/endpoints'

/**
 * Get all endpoints
 */
export async function getEndpoints(): Promise<Endpoint[]> {
  const response = await api.get<EndpointsResponse>('/proxy-targets')
  return response.proxyTargets
}

/**
 * Get a single endpoint by ID
 */
export async function getEndpoint(id: string): Promise<Endpoint> {
  const response = await api.get<EndpointResponse>(`/proxy-targets/${id}`)
  return response.proxyTarget
}

/**
 * Create a new endpoint
 */
export async function createEndpoint(data: CreateEndpointRequest): Promise<Endpoint> {
  const response = await api.post<EndpointResponse>('/proxy-targets', data)
  return response.proxyTarget
}

/**
 * Update an existing endpoint
 */
export async function updateEndpoint(id: string, data: UpdateEndpointRequest): Promise<Endpoint> {
  const response = await api.put<EndpointResponse>(`/proxy-targets/${id}`, data)
  return response.proxyTarget
}

/**
 * Delete an endpoint
 */
export async function deleteEndpoint(id: string): Promise<void> {
  await api.delete(`/proxy-targets/${id}`)
}

/**
 * Refresh the Redis cache
 */
export async function refreshCache(): Promise<RefreshCacheResponse> {
  return await api.post<RefreshCacheResponse>('/proxy-targets/refresh-cache')
}
