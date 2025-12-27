import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DataTable } from '@/app/data-table'
import { avatarColumns } from '@/app/data-table/avatar-columns'
import { avatarFilterFields } from '@/app/data-table/avatar-constants'
import { avatarData } from '@/app/data-table/avatar-data'
import { avatarGroupByOptions } from '@/app/data-table/avatar-group-options'
import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/data-table/table')({
  component: TablePage,
})

function TablePage() {
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
              columns={avatarColumns}
              data={avatarData}
              filterFields={avatarFilterFields}
              groupByOptions={avatarGroupByOptions}
              title="User Directory"
              description="Employee directory with grouping functionality - try grouping by department, status, or role"
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  )
}