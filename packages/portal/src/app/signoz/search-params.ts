import type { HttpMethod } from '@pzero/shared/types'
import {
  createParser,
  createSearchParamsCache,
  createSerializer,
  type inferParserType,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'
// Note: import from 'nuqs/server' to avoid the "use client" directive
import { SORT_DELIMITER } from '@/lib/delimiters'

// https://logs.run/i?sort=latency.desc

export const parseAsSort = createParser({
  parse(queryValue) {
    const [id, desc] = queryValue.split(SORT_DELIMITER)
    if (!id && !desc) return null
    return { id, desc: desc === 'desc' }
  },
  serialize(value) {
    return `${value.id}.${value.desc ? 'desc' : 'asc'}`
  },
})

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

export const searchParamsParser = {
  // SIGNOZ FILTERS
  serviceName: parseAsString,
  httpMethod: parseAsStringLiteral(HTTP_METHODS),
  startTime: parseAsInteger,
  endTime: parseAsInteger,
  // PAGINATION
  limit: parseAsInteger.withDefault(50),
  offset: parseAsInteger.withDefault(0),
  // REQUIRED FOR SORTING
  sort: parseAsSort,
  // REQUIRED FOR SELECTION
  traceId: parseAsString,
  spanId: parseAsString,
}

export const searchParamsCache = createSearchParamsCache(searchParamsParser)

export const searchParamsSerializer = createSerializer(searchParamsParser)

export type SearchParamsType = inferParserType<typeof searchParamsParser>
