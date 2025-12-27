import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { DataTable } from '@/app/data-table'
import { filterFields } from '@/app/data-table/constants'
import { treeColumns } from '@/app/data-table/tree-columns'
import { treeData } from '@/app/data-table/tree-data'
import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/data-table/tree')({
  component: TreeTablePage,
})

function TreeTablePage() {
  const { user, loading } = useAuthStore()
  const navigate = useNavigate({ from: Route.fullPath })

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/auth/sign-in' })
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <KBar>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-screen overflow-hidden">
          <div className="flex flex-col w-full h-full">
            <DataTable
              columns={treeColumns}
              data={treeData}
              filterFields={filterFields}
              title="Expandable Tree Data Table"
              description="Example of a data table with expandable tree rows using nested data structure"
              enableExpanding={true}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  )
}