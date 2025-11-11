import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import DefaultPage from '@/app/default/page'
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Users Table</h1>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <DefaultPage searchParams={Promise.resolve(search as { [key: string]: string | string[] | undefined })} />
        </Suspense>
      </div>
    </PageContainer>
  )
}