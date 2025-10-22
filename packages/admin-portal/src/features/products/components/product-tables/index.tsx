'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/table/data-table'
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar'
import { useDataTable } from '@/hooks/use-data-table'

interface ProductTableParams<TData, TValue> {
  data: TData[]
  columns: ColumnDef<TData, TValue>[]
  pagination?: {
    currentPage: number
    totalPages: number
    limit: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

/**
 * Render a data table configured for server-side pagination, sorting, and filtering.
 *
 * @param data - The array of rows to display in the table.
 * @param columns - Column definitions that describe how to render each row's fields.
 * @param pagination - Optional pagination state (current page, total pages, limits, hasNext/hasPrevious) used to derive the table's page count.
 * @returns A React element containing the data table and its toolbar configured for server-driven controls.
 */
export function ProductTable<TData, TValue>({ data, columns, pagination }: ProductTableParams<TData, TValue>) {
  // Use custom pagination with LIMIT/OFFSET
  const pageCount = pagination?.totalPages || 1

  const { table } = useDataTable({
    data, // product data
    columns, // product columns
    pageCount: pageCount,
    shallow: false, //Setting to false triggers a network request with the updated querystring.
    debounceMs: 500,
    manualFiltering: true, // Enable server-side filtering
    manualSorting: true, // Enable server-side sorting
    manualPagination: true, // Enable server-side pagination
  })

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  )
}
