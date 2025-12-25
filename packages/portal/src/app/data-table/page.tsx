import * as React from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { columns } from './columns'
import { filterFields } from './constants'
import { data } from './data'
import { searchParamsCache, searchParamsParser } from './search-params'
import { Skeleton } from './skeleton'

function PageContent({ search, title, description }: { search: any; title?: string; description?: string }) {
  return (
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
        .filter(({ value }) => value !== undefined)}
      searchParamsParser={searchParamsParser}
    />
  )
}

export default async function Page({
  searchParams,
  title,
  description,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  title?: string
  description?: string
}) {
  const search = searchParamsCache.parse(await searchParams)

  return (
    <React.Suspense fallback={<Skeleton />}>
      <PageContent search={search} title={title} description={description} />
    </React.Suspense>
  )
}
