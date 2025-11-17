import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Order } from '@/types'

interface ListApiResponse {
  success: boolean
  records: Order[]
  totalSize: number
  done: boolean
  pagination: {
    currentPage: number
    totalPages: number
    limit: number
    hasNext: boolean
    hasPrevious: boolean
  }
  message?: string
}

interface ApiResponse {
  success: boolean
  record: Order
  totalSize: number
  message?: string
}

interface PaginationParams {
  page?: number
  limit?: number
}

const fetchOrders = async (params?: PaginationParams): Promise<ListApiResponse> => {
  const queryParams = new URLSearchParams()

  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())

  const queryString = queryParams.toString()
  const url = queryString ? `/salesforce/Order/query?${queryString}` : '/salesforce/Order/query'

  const data: ListApiResponse = await api.get(url)

  if (data.success && data.records) {
    return data
  } else {
    throw new Error(data.message || 'Failed to fetch orders from API')
  }
}

const fetchOrder = async (orderId: string): Promise<Order> => {
  const data: ApiResponse = await api.get(`/salesforce/records/Order/${orderId}`)

  if (data.success && data.record) {
    return data.record
  } else {
    throw new Error(data.message || 'Failed to fetch order from API')
  }
}

const fetchOrdersLast30Days = async (): Promise<Order[]> => {
  const data: ListApiResponse = await api.get('/salesforce/Order/query/last-30-days')

  if (data.success && data.records) {
    return data.records
  } else {
    throw new Error(data.message || 'Failed to fetch orders from last 30 days from API')
  }
}

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

export const useOrdersPaginated = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ['orders', 'paginated', params],
    queryFn: () => fetchOrders(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    placeholderData: data => data,
  })
}

export const useOrder = (orderId: string | undefined) => {
  return useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: () => fetchOrder(orderId as string),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

export const useOrdersLast30Days = () => {
  return useQuery({
    queryKey: ['orders', 'last-30-days'],
    queryFn: fetchOrdersLast30Days,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
