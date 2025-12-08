/**
 * Type definitions for SigNoz Trace API
 * Based on: https://signoz.io/docs/traces-management/trace-api/payload-model/
 */

// Field data types
export type FieldDataType = 'string' | 'int64' | 'float64' | 'bool'

// Field context (attribute or resource)
export type FieldContext = 'attribute' | 'resource'

// Request types
export type RequestType = 'time_series' | 'scalar' | 'raw' | 'trace'

// Query types
export type QueryType = 'builder_query' | 'clickhouse_sql' | 'promql'

// Signal types
export type Signal = 'traces' | 'logs' | 'metrics'

// Sort direction
export type SortDirection = 'asc' | 'desc'

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

/**
 * Select Field - Used in raw/trace requestType to fetch columns/attributes
 */
export interface SelectField {
  name: string
}

/**
 * GroupBy Key - Used for grouping data
 */
export interface GroupByKey {
  name: string
}

/**
 * Order By - Used for ordering data
 */
export interface OrderBy {
  key: {
    name: string
  }
  direction: SortDirection
}

/**
 * Aggregation - Aggregation expression
 */
export interface Aggregation {
  expression: string // e.g., "count()", "avg(duration)", "p99(duration)"
  alias?: string // Optional alias for the aggregation result
}

/**
 * Filter - Filter expression for filtering data
 */
export interface Filter {
  expression: string // e.g., "hasError = true", "serviceName = 'api'", "http.method = 'GET'"
}

/**
 * Having - Filter expression used for filtering data after aggregation
 */
export interface Having {
  expression: string // e.g., "count() > 100", "avg_duration > 1000"
}

/**
 * Builder Query - Query specification for builder_query type
 */
export interface BuilderQuery {
  name: string // Query name (e.g., "A", "B", "C")
  signal: Signal // Source of data (e.g., "traces", "logs")
  stepInterval?: number // Aggregation interval for query in seconds
  aggregations?: Aggregation[] // Array of aggregation expressions
  filter?: Filter // Filter expression for filtering data
  selectFields?: SelectField[] // Used in raw/trace requestType to fetch columns/attributes
  groupBy?: GroupByKey[] // Used for groupBy
  order?: OrderBy[] // Used for ordering data
  having?: Having // Used for filtering data after aggregation
  disabled?: boolean // Specifies if the query is disabled
  limit?: number // Limit number of results
  offset?: number // Offset used in pagination
}

/**
 * Ch Query - Query specification for clickhouse_sql type
 */
export interface ChQuery {
  name: string // Query name (e.g., "A", "B", "C")
  query: string // Clickhouse query
  disabled?: boolean // Whether the query is disabled
}

/**
 * Query Envelope - Each query in the queries array
 */
export interface QueryEnvelope {
  type: QueryType // Type of query (e.g., "builder_query", "clickhouse_sql")
  spec: BuilderQuery | ChQuery // Query specification based on type
}

/**
 * Composite Query - Contains array of query envelopes
 */
export interface CompositeQuery {
  queries: QueryEnvelope[]
}

/**
 * Top-level SigNoz Query Payload
 */
export interface SigNozQueryPayload {
  start: number // Epoch timestamp marking the start of the query range (in milliseconds)
  end: number // Epoch timestamp marking the end of the query range (in milliseconds)
  requestType: RequestType // Type of response expected (e.g., "time_series", "scalar", "raw", "trace")
  compositeQuery: CompositeQuery // Contains the compositeQuery
  variables?: Record<string, any> // Map of variables used in the query (optional)
}

/**
 * Filter state for UI
 */
export interface SigNozFilters {
  serviceName?: string
  httpMethod?: HttpMethod
  startTime: number // Epoch timestamp in milliseconds
  endTime: number // Epoch timestamp in milliseconds
}

/**
 * Pagination state
 */
export interface SigNozPagination {
  limit: number
  offset: number
}

/**
 * Query options combining filters and pagination
 */
export interface SigNozQueryOptions {
  filters: SigNozFilters
  pagination: SigNozPagination
}

/**
 * Generic response structure from SigNoz API
 */
export interface SigNozResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

/**
 * Raw trace/log item (structure may vary based on selectFields)
 */
export type RawTraceItem = Record<string, any>
export type RawLogItem = Record<string, any>

/**
 * Response for raw traces/logs
 */
export interface RawDataResponse {
  data?: Array<RawTraceItem | RawLogItem>
  total?: number
  limit?: number
  offset?: number
}
