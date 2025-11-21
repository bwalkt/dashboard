import { createValidator } from '@pzero/shared/validator/ajv'
import { createParser } from 'nuqs/server'

import { dataTableConfig } from '@/config/data-table'

import type { ExtendedColumnFilter, ExtendedColumnSort } from '@/types/data-table'

// =============================================================================
// TypeScript Interfaces
// =============================================================================

interface SortingItem {
  id: string
  desc: boolean
}

interface FilterItem {
  id: string
  value: string | string[]
  variant: (typeof dataTableConfig.filterVariants)[number]
  operator: (typeof dataTableConfig.operators)[number]
  filterId: string
}

export type FilterItemSchema = FilterItem

// =============================================================================
// AJV Schemas
// =============================================================================

const sortingItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    desc: { type: 'boolean' },
  },
  required: ['id', 'desc'],
  additionalProperties: false,
}

export const getSortingStateParser = <TData>(columnIds?: string[] | Set<string>) => {
  const validKeys = columnIds ? (columnIds instanceof Set ? columnIds : new Set(columnIds)) : null

  return createParser({
    parse: value => {
      try {
        const parsed = JSON.parse(value)
        const arraySchema = { type: 'array', items: sortingItemSchema }
        const validator = createValidator<SortingItem[]>(arraySchema)
        const result = validator.validate(parsed)

        if (!result.success) return null

        if (validKeys && result.data?.some(item => !validKeys.has(item.id))) {
          return null
        }

        return result.data as ExtendedColumnSort<TData>[]
      } catch {
        return null
      }
    },
    serialize: value => JSON.stringify(value),
    eq: (a, b) =>
      a.length === b.length && a.every((item, index) => item.id === b[index]?.id && item.desc === b[index]?.desc),
  })
}

const filterItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    value: {
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    variant: { type: 'string', enum: [...dataTableConfig.filterVariants] },
    operator: { type: 'string', enum: [...dataTableConfig.operators] },
    filterId: { type: 'string' },
  },
  required: ['id', 'value', 'variant', 'operator', 'filterId'],
  additionalProperties: false,
}

// =============================================================================
// Validators
// =============================================================================

const validateSortingItem = createValidator<SortingItem>(sortingItemSchema)
const validateFilterItem = createValidator<FilterItem>(filterItemSchema)

export const getFiltersStateParser = <TData>(columnIds?: string[] | Set<string>) => {
  const validKeys = columnIds ? (columnIds instanceof Set ? columnIds : new Set(columnIds)) : null

  return createParser({
    parse: value => {
      try {
        const parsed = JSON.parse(value)
        const arraySchema = { type: 'array', items: filterItemSchema }
        const validator = createValidator<FilterItem[]>(arraySchema)
        const result = validator.validate(parsed)

        if (!result.success) return null

        if (validKeys && result.data?.some(item => !validKeys.has(item.id))) {
          return null
        }

        return result.data as ExtendedColumnFilter<TData>[]
      } catch {
        return null
      }
    },
    serialize: value => JSON.stringify(value),
    eq: (a, b) =>
      a.length === b.length &&
      a.every(
        (filter, index) =>
          filter.id === b[index]?.id &&
          filter.value === b[index]?.value &&
          filter.variant === b[index]?.variant &&
          filter.operator === b[index]?.operator,
      ),
  })
}
