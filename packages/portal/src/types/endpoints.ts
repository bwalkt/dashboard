export interface Endpoint {
  id: string
  name: string
  url: string
  port: number | null
  dscr?: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
}

export interface CreateEndpointRequest {
  name: string
  url: string
  port?: number
  dscr?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
}

export interface UpdateEndpointRequest {
  name?: string
  url?: string
  port?: number
  dscr?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
}

export interface EndpointsResponse {
  success: boolean
  proxyTargets: Endpoint[]
}

export interface EndpointResponse {
  success: boolean
  proxyTarget: Endpoint
}

export interface RefreshCacheResponse {
  success: boolean
  message: string
  count: number
  proxyTargets: Endpoint[]
}
