import type { IPAddress, Location } from './location'
export type PhysicalAddress = {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}
export const endpointStatuses = {
  active: 'active',
  revoked: 'revoked',
  pending: 'pending',
  verified: 'verified',
  unverified: 'unverified',
  inactive: 'inactive',
  blocked: 'blocked',
  suspended: 'suspended',
  deleted: 'deleted',
} as const
export type EndpointStatus = keyof typeof endpointStatuses
export type URLHeader = {
  key: string
  value: string
}
export const EndpointTypes = {
  phone: 'phone',
  email: 'email',
  url: 'url',
} as const
export type EndpointType = keyof typeof EndpointTypes
export type METHOD = {
  GET: 'GET'
  POST: 'POST'
  PUT: 'PUT'
  DELETE: 'DELETE'
  PATCH: 'PATCH'
}
export type Method = keyof METHOD
export type Endpoint = {
  id: string
  name: string
  baseURI?: string
  address?: string | IPAddress | PhysicalAddress
  headers?: URLHeader[]
  methods?: Method[]
  variables?: Record<string, any>
  dateAdded: number
  dateUpdated: number
  dateRevoked?: number
  revokedReason?: string
  location?: Location
  status: EndpointStatus
  [key: string]: any
}
export const endpointSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    baseURI: { type: 'string', format: 'uri' },
  },
  required: ['name', 'baseURI'],
  additionalProperties: false,
}
