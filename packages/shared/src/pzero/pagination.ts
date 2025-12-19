export const PaginationListResponseSchema = {
  type: 'object' as const,
  properties: {
    total: { type: 'number' as const },
    page: { type: 'number' as const },
    limit: { type: 'number' as const },
  },
  required: ['total', 'page', 'limit'] as const,
  additionalProperties: false,
}

export type PaginationListResponse = {
  total: number
  page: number
  limit: number
}

export type PaginationParams = {
  page: number
  perPage: number
  sortOrder: 'asc' | 'desc'
  dateFrom: number
  [key: string]: any
}
