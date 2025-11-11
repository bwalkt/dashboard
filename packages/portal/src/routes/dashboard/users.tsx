import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import DefaultPage from '@/app/default/page'
import { DataTableTitle } from '@/components/data-table/data-table-title'
import PageContainer from '@/components/layout/page-container'

export const Route = createFileRoute('/dashboard/users')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => search,
})

function RouteComponent() {
  const search = Route.useSearch()

  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <DataTableTitle 
          title="Users" 
          description="Manage and monitor user accounts and their activity"
        />
        <Suspense fallback={<div>Loading...</div>}>
          <DefaultPage searchParams={Promise.resolve(search as { [key: string]: string | string[] | undefined })} />
        </Suspense>
      </div>
    </PageContainer>
  )
}