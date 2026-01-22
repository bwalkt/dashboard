'use client'

import type { RawDataResponse } from '@pzero/shared/types'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface SignozResultsTableProps {
  data: RawDataResponse | undefined
  isLoading: boolean
  error: Error | null
  onLoadMore: () => void
  hasMore: boolean
  isLoadingMore: boolean
}

/**
 * Convert column name to Title Case
 * Examples: "serviceName" -> "Service Name", "span_id" -> "Span Id", "durationMs" -> "Duration Ms"
 */
function toTitleCase(columnName: string): string {
  // Handle special abbreviations
  const abbreviations: Record<string, string> = {
    id: 'ID',
    ms: 'Ms',
    http: 'HTTP',
    api: 'API',
    url: 'URL',
    uri: 'URI',
  }

  // Split by camelCase, snake_case, or hyphens
  const words = columnName
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  // Capitalize each word, handling abbreviations
  return words
    .map(word => {
      const lowerWord = word.toLowerCase()
      return abbreviations[lowerWord] || word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function SignozResultsTable({
  data,
  isLoading,
  error,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: SignozResultsTableProps) {
  // Ensure items is always an array
  const items = Array.isArray(data?.data) ? data.data : []

  // Extract column names from the first item if available
  const columns = React.useMemo(() => {
    if (items.length === 0) return []
    const firstItem = items[0]
    if (!firstItem || typeof firstItem !== 'object') return []
    return Object.keys(firstItem)
  }, [items])

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-2 text-sm text-muted-foreground">Loading data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-2 text-sm font-medium text-destructive">Error loading data</div>
          <div className="text-sm text-muted-foreground">{error.message}</div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-2 text-sm text-muted-foreground">No data found</div>
          <div className="text-xs text-muted-foreground">Try adjusting your filters or time range</div>
        </div>
      </div>
    )
  }

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '-'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    if (typeof value === 'number') {
      return value.toString()
    }
    return String(value)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead key={column} className="whitespace-nowrap">
                    {toTitleCase(column)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                // Generate a stable unique key for each row
                // Prefer trace_id or span_id if available, otherwise use composite key
                const stableKey = item.trace_id ? item.trace_id : item.span_id ? item.span_id : `item-${index}`

                return (
                  <TableRow key={stableKey}>
                    {columns.map(column => (
                      <TableCell key={column} className="max-w-xs truncate">
                        <div className="truncate" title={formatCellValue(item[column])}>
                          {formatCellValue(item[column])}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} disabled={isLoadingMore} variant="outline" className="w-full md:w-auto">
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Results count */}
      {items.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {items.length} result{items.length !== 1 ? 's' : ''}
          {data?.total !== undefined && ` of ${data.total}`}
        </div>
      )}
    </div>
  )
}
