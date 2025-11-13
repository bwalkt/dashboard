import { createFileRoute, redirect } from '@tanstack/react-router'
import * as React from 'react'
import { DataTable } from '@/app/data-table'
import { filterFields } from '@/app/data-table/constants'
import { treeColumns } from '@/app/data-table/tree-columns'
import { treeData } from '@/app/data-table/tree-data'
import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/data-table/tree')({
  component: TreeTablePage,
})

function TreeTablePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    throw redirect({ to: '/auth/sign-in' })
  }

  return (
    <KBar>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-screen overflow-hidden">
          <div className="flex flex-col gap-4 sm:gap-8 w-full max-w-7xl mx-auto relative min-h-full h-full rounded-lg border border-border/50 bg-background/50 p-4 backdrop-blur-[2px] sm:p-8">
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