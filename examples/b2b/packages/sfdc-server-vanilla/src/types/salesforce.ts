/**
 * TypeScript type definitions for Salesforce API integration
 */

// Salesforce Configuration Types
export interface SalesforceConfig {
  consumerKey: string
  username: string
  loginUrl?: string
}

// Salesforce Authentication Response
export interface SalesforceAuthResponseRaw {
  access_token: string
  instance_url: string
  token_type: string
  scope: string
}
// Salesforce Authentication Response
export interface SalesforceAuthResponse {
  accessToken: string
  instanceUrl: string
  tokenType: string
  scope: string
}

// Salesforce API Response Types
export interface SalesforceQueryResponse {
  totalSize: number
  done?: boolean
  nextRecordsUrl?: string
  records: Record<string, any>[]
}

export interface SalesforceRecordResponse {
  id: string
  success: boolean
  errors?: SalesforceError[]
}

export interface SalesforceError {
  statusCode: string
  message: string
  fields?: string[]
}

// Salesforce Object Metadata
export interface SalesforceFieldMetadata {
  name: string
  type: string
  label: string
  length?: number
  required: boolean
  unique: boolean
  updateable: boolean
  createable: boolean
  nillable: boolean
  defaultValue?: any
  picklistValues?: Array<{
    value: string
    label: string
    active: boolean
  }>
}

export interface SalesforceObjectMetadata {
  name: string
  label: string
  labelPlural: string
  keyPrefix: string
  fields: SalesforceFieldMetadata[]
  createable: boolean
  updateable: boolean
  deletable: boolean
  queryable: boolean
  searchable: boolean
  custom: boolean
}

// JWT Service Types
export interface JWTAssertionParams {
  consumerKey: string
  username: string
  loginUrl?: string
  audience?: string
  expiresIn?: number
}

export interface JWTPayload {
  iss: string // Issuer (Consumer Key)
  sub: string // Subject (Username)
  aud: string // Audience
  exp: number // Expiration time
  iat: number // Issued at
  jti: string // JWT ID
}

// API Call Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiCallOptions {
  method: HttpMethod
  endpoint: string
  data?: Record<string, any>
  headers?: Record<string, string>
}

// Fastify Route Types
export interface SalesforceHealthResponse {
  status: string
  configured: boolean
  consumerKey: string
  username: string
}

export interface SalesforceQueryRequest {
  soql: string
}

export interface SalesforceQueryParams {
  page?: number
  limit?: number
  sort?: string
}

export interface SalesforcePaginatedResponse {
  success: boolean
  totalSize: number
  records: Record<string, any>[]
  done: boolean
  pagination: {
    currentPage: number
    totalPages: number
    limit: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export interface SalesforceRecordRequest {
  [key: string]: any
}

export interface SalesforceRecordResponse {
  success: boolean
  message: string
  id: string
}

export interface SalesforceMetadataResponse {
  success: boolean
  objectType: string
  metadata: SalesforceObjectMetadata
}

// Environment Variables Documentation
export interface EnvironmentVariables {
  SALESFORCE_CONSUMER_KEY: string
  SALESFORCE_USERNAME: string
  SALESFORCE_LOGIN_URL?: string
}
