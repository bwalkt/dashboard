import { HTTP_METHODS, HTTP_STATUS } from '@pzero/shared/http';
import {
  createParser,
  createSearchParamsCache,
  createSerializer,
  type inferParserType,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'
// Note: import from 'nuqs/server' to avoid the "use client" directive
import { ARRAY_DELIMITER, SLIDER_DELIMITER, SORT_DELIMITER } from '@/lib/delimiters'

// https://logs.run/i?sort=latency.desc

export const parseAsSort = createParser({
  parse(queryValue) {
    const [id, desc] = queryValue.split(SORT_DELIMITER)
    const trimmedId = id.trim()
    if (!trimmedId) return null
    return { id: trimmedId, desc: desc === 'desc' }
  },
  serialize(value) {
    return `${value.id}.${value.desc ? 'desc' : 'asc'}`
  },
})

export const searchParamsParser = {
  // SIGNOZ FILTERS
  serviceName: parseAsString,
  http_method: parseAsArrayOf(parseAsStringLiteral(HTTP_METHODS), ARRAY_DELIMITER),
  http_host: parseAsString,
  http_url: parseAsString,
  responseStatusCode: parseAsArrayOf(parseAsStringLiteral(HTTP_STATUS), ARRAY_DELIMITER),
  durationMs: parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
  'timingPhases.dns': parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
  'timingPhases.connection': parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
  'timingPhases.tls': parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
  'timingPhases.ttfb': parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
  'timingPhases.transfer': parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
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
