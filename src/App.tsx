import Providers from "@/components/layout/providers";
import ThemeProvider from "@/components/layout/ThemeToggle/theme-provider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { fontVariables } from "@/lib/font";
import { cn } from "@/lib/utils";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

// Import all CSS styles
import "@/styles/globals.css";
import "@/styles/theme.css";

// Import pages
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import Accounts from "./pages/dashboard/Accounts";
import Leads from "./pages/dashboard/Leads";
import MobileDashboardLayout from "./pages/dashboard/MobileLayout";
import Opportunities from "./pages/dashboard/Opportunities";
import Overview from "./pages/dashboard/Overview";
import Products from "./pages/dashboard/Products";
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
            {/* Auth routes - no authentication required */}
            <Route path="/auth/sign-in" element={<SignIn />} />
            <Route path="/auth/sign-up" element={<SignUp />} />

            {/* Dashboard routes - authentication required */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <MobileDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard/overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="leads" element={<Leads />} />
              <Route path="products" element={<Products />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Root redirect - go to sign in */}
            <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />

            {/* Catch all other routes */}
            <Route path="*" element={<Navigate to="/auth/sign-in" replace />} />
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
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NuqsAdapter>
    </BrowserRouter>
  );
}

export default App;
