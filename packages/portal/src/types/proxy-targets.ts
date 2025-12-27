export interface ProxyTarget {
  id: string
  name: string
  url: string
  port: number | null
  dscr?: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
}

export interface CreateProxyTargetRequest {
  name: string
  url: string
  port?: number
  dscr?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
}

export interface UpdateProxyTargetRequest {
  name?: string
  url?: string
  port?: number
  dscr?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
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
