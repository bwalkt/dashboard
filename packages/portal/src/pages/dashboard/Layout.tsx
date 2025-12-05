import { Outlet } from '@tanstack/react-router'
import { type ReactNode } from 'react'
import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

type DashboardLayoutProps = {
  children?: ReactNode
}

/**
 * Dashboard layout composing global command palette, sidebar, and route outlet.
 *
 * Initializes the sidebar's default open state from localStorage key `'sidebar_state'` on mount.
 *
 * @returns The rendered layout element containing `KBar`, `SidebarProvider` (with `AppSidebar`), `SidebarInset`, and the route `Outlet` or children.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <KBar>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-screen overflow-hidden">{children || <Outlet />}</SidebarInset>
      </SidebarProvider>
    </KBar>
  )
}
