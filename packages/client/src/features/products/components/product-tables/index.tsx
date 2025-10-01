"use client";

import { DataTable } from "@/components/ui/table/data-table";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";

import { useDataTable } from "@/hooks/use-data-table";

import { ColumnDef } from "@tanstack/react-table";

interface ProductTableParams<TData, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export function ProductTable<TData, TValue>({ data, columns, pagination }: ProductTableParams<TData, TValue>) {
  // Use custom pagination with LIMIT/OFFSET
  const pageCount = pagination?.totalPages || 1;

  const { table } = useDataTable({
    data, // product data
    columns, // product columns
    pageCount: pageCount,
    shallow: false, //Setting to false triggers a network request with the updated querystring.
    debounceMs: 500,
    manualFiltering: true, // Enable server-side filtering
    manualSorting: true, // Enable server-side sorting
    manualPagination: true, // Enable server-side pagination
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
