import * as React from "react";
import { columns } from "./columns";
import { filterFields } from "./constants";
import { data } from "./data";
import { DataTable } from "./data-table";
import { searchParamsCache } from "./search-params";
import { Skeleton } from "./skeleton";

export default async function Page({
  searchParams,
  title,
  description,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  title?: string;
  description?: string;
}) {
  const search = searchParamsCache.parse(await searchParams);

  return (
    <React.Suspense fallback={<Skeleton />}>
      <DataTable
        columns={columns}
        data={data}
        filterFields={filterFields}
        title={title}
        description={description}
        defaultColumnFilters={Object.entries(search)
          .map(([key, value]) => ({
            id: key,
            value,
          }))
          .filter(({ value }) => value ?? undefined)}
      />
    </React.Suspense>
  );
}
