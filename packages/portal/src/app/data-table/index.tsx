// Re-export DataTable from components with searchParamsParser provided
import { DataTable as BaseDataTable, type DataTableProps } from "@/components/data-table/data-table";
import { searchParamsParser } from "./search-params";

// Wrapper component that provides searchParamsParser for backward compatibility
export function DataTable<TData, TValue>(props: Omit<DataTableProps<TData, TValue>, "searchParamsParser">) {
  return <BaseDataTable {...props} searchParamsParser={searchParamsParser} />;
}

export type { DataTableProps } from "@/components/data-table/data-table";
