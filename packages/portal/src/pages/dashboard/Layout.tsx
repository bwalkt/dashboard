import { Outlet } from '@tanstack/react-router'
import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

/**
 * Dashboard layout composing global command palette, sidebar, and route outlet.
 *
 * Initializes the sidebar's default open state from localStorage key `'sidebar_state'` on mount.
 *
 * @returns The rendered layout element containing `KBar`, `SidebarProvider` (with `AppSidebar`), `SidebarInset`, and the route `Outlet`.
 */
export default function DashboardLayout() {
  return (
    <KBar>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  )
}
