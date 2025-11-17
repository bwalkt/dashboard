'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/table/data-table'
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar'
import { useDataTable } from '@/hooks/use-data-table'

interface OrderTableParams<TData, TValue> {
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

export function OrderTable<TData, TValue>({ data, columns, pagination }: OrderTableParams<TData, TValue>) {
  // Use custom pagination with LIMIT/OFFSET
  const pageCount = pagination?.totalPages || 1

  const { table } = useDataTable({
    data, // order data
    columns, // order columns
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
