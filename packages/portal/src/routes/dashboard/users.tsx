import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import DefaultPage from '@/app/data-table/page'

export const Route = createFileRoute('/dashboard/users')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => search,
})

function RouteComponent() {
  const search = Route.useSearch()

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DefaultPage
        searchParams={Promise.resolve(search as { [key: string]: string | string[] | undefined })}
        title="Users"
        description="Manage and monitor user accounts and their activity"
      />
    </Suspense>
  )
}
