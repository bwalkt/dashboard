import { createFileRoute, useNavigate  } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DataTable } from '@/app/data-table'
import { avatarColumns } from '@/app/data-table/avatar-columns'
import { avatarFilterFields } from '@/app/data-table/avatar-constants'
import { avatarData } from '@/app/data-table/avatar-data'
import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/table')({
  component: TablePage,
})

function TablePage() {
  const { user, loading } = useAuth()
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
          <div className="flex flex-col gap-4 sm:gap-8 w-full max-w-7xl mx-auto relative min-h-full h-full rounded-lg border border-border/50 bg-background/50 p-4 backdrop-blur-[2px] sm:p-8">
            <DataTable
              columns={avatarColumns}
              data={avatarData}
              filterFields={avatarFilterFields}
              title="User Directory"
              description="Employee directory showcasing avatar components with initials fallback"
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  )
}