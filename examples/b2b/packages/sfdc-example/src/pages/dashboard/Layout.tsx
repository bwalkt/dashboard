import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import Header from '@/components/layout/header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function DashboardLayout() {
  const [defaultOpen, setDefaultOpen] = useState(true)

  useEffect(() => {
    const sidebarState = localStorage.getItem('sidebar_state')
    setDefaultOpen(sidebarState === 'true')
  }, [])

  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  )
}
