import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Providers from "@/components/layout/providers";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/layout/ThemeToggle/theme-provider";
import { fontVariables } from "@/lib/font";
import { cn } from "@/lib/utils";
import { NuqsAdapter } from "nuqs/adapters/react";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Import all CSS styles
import "@/styles/globals.css";
import "@/styles/theme.css";

// Import pages
import MobileDashboardLayout from "./pages/dashboard/MobileLayout";
import Overview from "./pages/dashboard/Overview";
import Accounts from "./pages/dashboard/Accounts";
import Opportunities from "./pages/dashboard/Opportunities";
import Leads from "./pages/dashboard/Leads";
import Data from "./pages/dashboard/Data";
import Settings from "./pages/dashboard/Settings";

// Configure NProgress
NProgress.configure({ showSpinner: false });

function ProgressBar() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();
    NProgress.done();
  }, [location.pathname]);

  return null;
}

function AppContent() {
  const activeThemeValue = localStorage.getItem("active_theme") || "";
  const isScaled = activeThemeValue?.endsWith("-scaled");

  console.log("App rendering, theme:", activeThemeValue || "default");

  return (
    <div
      className={cn(
        "bg-background min-h-screen font-sans antialiased",
        activeThemeValue ? `theme-${activeThemeValue}` : "",
        isScaled ? "theme-scaled" : "",
        fontVariables
      )}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange enableColorScheme>
        <Providers activeThemeValue={activeThemeValue}>
          <Toaster />
          <ProgressBar />
          <Routes>
            {/* Dashboard routes - no authentication required */}
            <Route path="/dashboard/*" element={<MobileDashboardLayout />}>
              <Route index element={<Navigate to="/dashboard/overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="leads" element={<Leads />} />
              <Route path="data" element={<Data />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Root redirect - go directly to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />

            {/* Catch all other routes */}
            <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
          </Routes>
        </Providers>
      </ThemeProvider>
    </div>
  );
}

function App() {
  console.log("=== APP STARTING ===");
  console.log("App component rendering - full dashboard");

  return (
    <BrowserRouter>
      <NuqsAdapter>
        <AppContent />
      </NuqsAdapter>
    </BrowserRouter>
  );
}

export default App;
