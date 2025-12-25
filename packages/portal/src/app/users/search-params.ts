import {
  createParser,
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'
// Note: import from 'nuqs/server' to avoid the "use client" directive
import { ARRAY_DELIMITER } from '@/lib/delimiters'
import type { UserStatus, UserOnlineStatus } from './types'

export const parseAsSort = createParser({
  parse(queryValue) {
    const [id, desc] = queryValue.split('.')
    if (!id || !desc) return null
    return { id, desc: desc === 'desc' }
  },
  serialize(value) {
    return `${value.id}.${value.desc ? 'desc' : 'asc'}`
  },
})

const USER_STATUSES: readonly UserStatus[] = ['ACTIVE', 'INACTIVE', 'BANNED', 'DELETED', 'PENDING', 'BLOCKED'] as const
const ONLINE_STATUSES: readonly UserOnlineStatus[] = ['ONLINE', 'OOO', 'AWAY', 'BUSY', 'INACTIVE'] as const

export const searchParamsParser = {
  // FILTERS
  status: parseAsArrayOf(parseAsStringLiteral(USER_STATUSES), ARRAY_DELIMITER),
  online_status: parseAsArrayOf(parseAsStringLiteral(ONLINE_STATUSES), ARRAY_DELIMITER),
  email_verified: parseAsArrayOf(parseAsBoolean, ARRAY_DELIMITER),
  is_act: parseAsArrayOf(parseAsBoolean, ARRAY_DELIMITER),
  handle: parseAsString,
  name: parseAsString,
  email: parseAsString,
}

export const searchParamsCache = createSearchParamsCache(searchParamsParser)

// NOTE: check if `inferParserType` could be useful
