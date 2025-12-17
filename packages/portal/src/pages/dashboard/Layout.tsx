import { Outlet } from '@tanstack/react-router'
import { type ReactNode } from 'react'
import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type DashboardLayoutProps = {
  children?: ReactNode
  fullWidth?: boolean
}

/**
 * Dashboard layout composing global command palette, sidebar, and route outlet.
 *
 * Initializes the sidebar's default open state from localStorage key `'sidebar_state'` on mount.
 *
 * @returns The rendered layout element containing `KBar`, `SidebarProvider` (with `AppSidebar`), `SidebarInset`, and the route `Outlet` or children.
 */
export default function DashboardLayout({ children, fullWidth = false }: DashboardLayoutProps) {
  return (
    <KBar>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className={cn('h-screen overflow-hidden', fullWidth && '!m-0')}>
          {children || <Outlet />}
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  )
}
