import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import KBar from '@/components/kbar'
import MobileAppSidebar from '@/components/layout/mobile-app-sidebar'
import MobileHeader from '@/components/layout/mobile-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

/**
 * Render the mobile-optimized admin dashboard layout with a sidebar, header, and nested-route outlet.
 *
 * The layout is wrapped in KBar and SidebarProvider and keeps the sidebar open for testing purposes.
 *
 * @returns The React element for the mobile dashboard layout containing the sidebar, header, and an Outlet for nested routes.
 */
export default function MobileDashboardLayout() {
  // Force sidebar open for mobile testing
  const [defaultOpen, setDefaultOpen] = useState(true)

  useEffect(() => {
    // Always keep it open for now to debug
    setDefaultOpen(true)
  }, [])

  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="flex h-screen w-full">
          <MobileAppSidebar />
          <SidebarInset className="flex-1">
            <MobileHeader />
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </KBar>
  )
}
