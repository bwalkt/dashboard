// TODO: check if we can move to /data-table-filter-command/utils.ts

import { createValidator } from '@boardwalk/shared/validator/ajv'
import type { ColumnFiltersState } from '@tanstack/react-table'
import { ARRAY_DELIMITER, RANGE_DELIMITER, SLIDER_DELIMITER } from '@/lib/delimiters'
import type { DataTableFilterField } from './types'

export function deserialize<T>(schema: any) {
  const validator = createValidator<T>(schema)

  const preprocess = (val: unknown) => {
    if (typeof val !== 'string') return val
    return val
      .trim()
      .split(' ')
      .reduce(
        (prev, curr) => {
          const [name, value] = curr.split(':')
          if (!value || !name) return prev
          prev[name] = value
          return prev
        },
        {} as Record<string, unknown>,
      )
  }

  return (value: string) => {
    const preprocessed = preprocess(value)
    const result = validator.validate(preprocessed)

    return {
      success: result.success,
      data: result.data,
      error: result.errors ? { issues: result.errors } : undefined,
    }
  }
}

// Note: Serialize function was removed as part of Zod to AJV migration
// If needed, implement using AJV schema and manual serialization

export function serializeColumFilters<TData>(
  columnFilters: ColumnFiltersState,
  filterFields?: DataTableFilterField<TData>[],
) {
  return columnFilters.reduce((prev, curr) => {
    const { type, commandDisabled } = filterFields?.find(field => curr.id === field.value) || { commandDisabled: true } // if column filter is not found, disable the command by default

    if (commandDisabled) return prev

    if (Array.isArray(curr.value)) {
      if (type === 'slider') {
        return `${prev}${curr.id}:${curr.value.join(SLIDER_DELIMITER)} `
      }
      if (type === 'checkbox') {
        return `${prev}${curr.id}:${curr.value.join(ARRAY_DELIMITER)} `
      }
      if (type === 'timerange') {
        return `${prev}${curr.id}:${curr.value.join(RANGE_DELIMITER)} `
      }
    }

    return `${prev}${curr.id}:${curr.value} `
  }, '')
}
