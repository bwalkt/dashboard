export interface ProxyTarget {
  id: string
  name: string
  url: string
  port: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateProxyTargetRequest {
  name: string
  url: string
  port?: number
}

export interface UpdateProxyTargetRequest {
  name?: string
  url?: string
  port?: number
}

export interface ProxyTargetsResponse {
  success: boolean
  proxyTargets: ProxyTarget[]
}

export interface ProxyTargetResponse {
  success: boolean
  proxyTarget: ProxyTarget
}

export interface RefreshCacheResponse {
  success: boolean
  message: string
  count: number
  proxyTargets: ProxyTarget[]
}
