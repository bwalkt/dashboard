import { Outlet } from 'react-router-dom';
import KBar from '@/components/kbar';
import MobileAppSidebar from '@/components/layout/mobile-app-sidebar';
import MobileHeader from '@/components/layout/mobile-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useState, useEffect } from 'react';

export default function MobileDashboardLayout() {
  const [defaultOpen, setDefaultOpen] = useState(true);

  useEffect(() => {
    const sidebarState = localStorage.getItem('sidebar_state');
    setDefaultOpen(sidebarState === 'true');
  }, []);

  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <MobileAppSidebar />
        <SidebarInset>
          <MobileHeader />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}