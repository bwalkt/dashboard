"use client";

import { DataTable } from "@/components/data-table/data-table";
import { columns } from "./columns";
import { filterFields } from "./constants";
import { useUsers } from "./hooks";
import { searchParamsParser } from "./search-params";
import { Skeleton } from "./skeleton";

export function PageContent({ search, title, description }: { search: any; title?: string; description?: string }) {
  const { data: users, isLoading } = useUsers();
  if (isLoading) return <Skeleton />;
  return (
    <DataTable
      columns={columns}
      data={users ?? []}
      filterFields={filterFields}
      title={title}
      description={description}
      cellPadding="md"
      defaultColumnFilters={Object.entries(search)
        .map(([key, value]) => ({
          id: key,
          value,
        }))
        .filter(({ value }) => value !== undefined)}
      searchParamsParser={searchParamsParser}
    />
  );
}
