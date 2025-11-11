
import type { Column } from '@tanstack/react-table'
import { CalendarIcon, XCircle } from 'lucide-react'
import * as React from 'react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/format'

type DateSelection = Date[] | DateRange

/**
 * Determines whether the given DateSelection represents a date range (an object with `from`/`to`).
 *
 * @param value - The selection to test
 * @returns `true` if `value` is a `DateRange` object with `from`/`to`, `false` otherwise.
 */
function getIsDateRange(value: DateSelection): value is DateRange {
  return value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Convert a numeric or string timestamp into a Date object, or yield undefined for missing/invalid input.
 *
 * @param timestamp - A millisecond epoch value or numeric string representing a date; may be undefined.
 * @returns A `Date` constructed from `timestamp`, or `undefined` if `timestamp` is missing or cannot be parsed as a valid date.
 */
function parseAsDate(timestamp: number | string | undefined): Date | undefined {
  if (!timestamp) return undefined
  const numericTimestamp = typeof timestamp === 'string' ? Number(timestamp) : timestamp
  const date = new Date(numericTimestamp)
  return !Number.isNaN(date.getTime()) ? date : undefined
}

/**
 * Normalize a column filter value into an array of strings or numbers.
 *
 * @param value - The raw filter value which may be `null`/`undefined`, a string, a number, or an array of mixed items.
 * @returns An array of values where:
 * - `null` or `undefined` => `[]`
 * - string or number => `[value]`
 * - array => each element is returned if it is a string or number, otherwise `undefined`
 * - any other type => `[]`
 */
function parseColumnFilterValue(value: unknown) {
  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'number' || typeof item === 'string') {
        return item
      }
      return undefined
    })
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return [value]
  }

  return []
}

interface DataTableDateFilterProps<TData> {
  column: Column<TData, unknown>
  title?: string
  multiple?: boolean
}

/**
 * Renders a table column date filter trigger and popover calendar for selecting a single date or a date range.
 *
 * Renders a button that shows the current selection (or title) and a popover Calendar. Selecting a date or range updates the provided column's filter value as a timestamp (single) or a two-element `[from, to]` timestamp array (range). The trigger also exposes a clear control when a value is present.
 *
 * @param column - The table column whose filter value will be read and updated.
 * @param title - Optional label shown in the trigger.
 * @param multiple - When true, enables range selection; when false, enables single-date selection.
 * @returns The UI element for the date filter (Popover trigger and Calendar content).
 */
export function DataTableDateFilter<TData>({ column, title, multiple }: DataTableDateFilterProps<TData>) {
  const columnFilterValue = column.getFilterValue()

  const selectedDates = React.useMemo<DateSelection>(() => {
    if (!columnFilterValue) {
      return multiple ? { from: undefined, to: undefined } : []
    }

    if (multiple) {
      const timestamps = parseColumnFilterValue(columnFilterValue)
      return {
        from: parseAsDate(timestamps[0]),
        to: parseAsDate(timestamps[1]),
      }
    }

    const timestamps = parseColumnFilterValue(columnFilterValue)
    const date = parseAsDate(timestamps[0])
    return date ? [date] : []
  }, [columnFilterValue, multiple])

  const onSelect = React.useCallback(
    (date: Date | DateRange | undefined) => {
      if (!date) {
        column.setFilterValue(undefined)
        return
      }

      if (multiple && !('getTime' in date)) {
        const from = date.from?.getTime()
        const to = date.to?.getTime()
        column.setFilterValue(from || to ? [from, to] : undefined)
      } else if (!multiple && 'getTime' in date) {
        column.setFilterValue(date.getTime())
      }
    },
    [column, multiple],
  )

  const onReset = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      column.setFilterValue(undefined)
    },
    [column],
  )

  const hasValue = React.useMemo(() => {
    if (multiple) {
      if (!getIsDateRange(selectedDates)) return false
      return selectedDates.from || selectedDates.to
    }
    if (!Array.isArray(selectedDates)) return false
    return selectedDates.length > 0
  }, [multiple, selectedDates])

  const formatDateRange = React.useCallback((range: DateRange) => {
    if (!range.from && !range.to) return ''
    if (range.from && range.to) {
      return `${formatDate(range.from)} - ${formatDate(range.to)}`
    }
    return formatDate(range.from ?? range.to)
  }, [])

  const label = React.useMemo(() => {
    if (multiple) {
      if (!getIsDateRange(selectedDates)) return null

      const hasSelectedDates = selectedDates.from || selectedDates.to
      const dateText = hasSelectedDates ? formatDateRange(selectedDates) : 'Select date range'

      return (
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {hasSelectedDates && (
            <>
              <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
              <span>{dateText}</span>
            </>
          )}
        </span>
      )
    }

    if (getIsDateRange(selectedDates)) return null

    const hasSelectedDate = selectedDates.length > 0
    const dateText = hasSelectedDate ? formatDate(selectedDates[0]) : 'Select date'

    return (
      <span className="flex items-center gap-2">
        <span>{title}</span>
        {hasSelectedDate && (
          <>
            <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
            <span>{dateText}</span>
          </>
        )}
      </span>
    )
  }, [selectedDates, multiple, formatDateRange, title])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          {hasValue ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              onClick={onReset}
              className="focus-visible:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:outline-none"
            >
              <XCircle />
            </div>
          ) : (
            <CalendarIcon />
          )}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {multiple ? (
          <Calendar
            initialFocus
            mode="range"
            selected={getIsDateRange(selectedDates) ? selectedDates : { from: undefined, to: undefined }}
            onSelect={onSelect}
          />
        ) : (
          <Calendar
            initialFocus
            mode="single"
            selected={!getIsDateRange(selectedDates) ? selectedDates[0] : undefined}
            onSelect={onSelect}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
