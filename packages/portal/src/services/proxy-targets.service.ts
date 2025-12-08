import { api } from '@/lib/api'
import type {
  CreateProxyTargetRequest,
  ProxyTarget,
  ProxyTargetResponse,
  ProxyTargetsResponse,
  RefreshCacheResponse,
  UpdateProxyTargetRequest,
} from '@/types/proxy-targets'

/**
 * Get all proxy targets
 */
export async function getProxyTargets(): Promise<ProxyTarget[]> {
  const response = await api.get<ProxyTargetsResponse>('/proxy-targets')
  return response.proxyTargets
}

/**
 * Get a single proxy target by ID
 */
export async function getProxyTarget(id: string): Promise<ProxyTarget> {
  const response = await api.get<ProxyTargetResponse>(`/proxy-targets/${id}`)
  return response.proxyTarget
}

/**
 * Create a new proxy target
 */
export async function createProxyTarget(data: CreateProxyTargetRequest): Promise<ProxyTarget> {
  const response = await api.post<ProxyTargetResponse>('/proxy-targets', data)
  return response.proxyTarget
}

/**
 * Update an existing proxy target
 */
export async function updateProxyTarget(id: string, data: UpdateProxyTargetRequest): Promise<ProxyTarget> {
  const response = await api.put<ProxyTargetResponse>(`/proxy-targets/${id}`, data)
  return response.proxyTarget
}

/**
 * Delete a proxy target
 */
export async function deleteProxyTarget(id: string): Promise<void> {
  await api.delete(`/proxy-targets/${id}`)
}

/**
 * Refresh the Redis cache
 */
export async function refreshCache(): Promise<RefreshCacheResponse> {
  return await api.post<RefreshCacheResponse>('/proxy-targets/refresh-cache')
}
