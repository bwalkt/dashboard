// @ts-expect-error no declaration file
import NProgress from "nprogress";
import { useThemeConfig } from "@/components/active-theme";
import Providers from "@/components/layout/providers";
import ThemeProvider from "@/components/layout/ThemeToggle/theme-provider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "@/lib/font";
import { cn } from "@/lib/utils";
import "nprogress/nprogress.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

// Import all CSS styles
import "@/styles/globals.css";
import "@/styles/theme.css";

// Import pages
import OrderViewPage from "./features/orders/components/order-view-page";
import ProductViewPage from "./features/products/components/product-view-page";
import CallbackPage from "./pages/auth/callback";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import TauriCallbackPage from "./pages/auth/tauri-callback";
import MobileDashboardLayout from "./pages/dashboard/MobileLayout";
import Orders from "./pages/dashboard/Orders";
import Overview from "./pages/dashboard/Overview";
import Products from "./pages/dashboard/Products";

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

function ThemedAppContent() {
  const { activeTheme } = useThemeConfig();
  const isScaled = activeTheme?.endsWith("-scaled");
  const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;
  return (
    <div className={cn("bg-background min-h-screen font-sans antialiased", `theme-${activeTheme}`, isScaled ? "theme-scaled" : "", fontVariables)}>
      <Toaster />
      <ProgressBar />
      <Routes>
        {/* Auth routes - no authentication required */}
        <Route path="/auth/sign-in" element={<SignIn />} />
        <Route path="/auth/sign-up" element={<SignUp />} />
        <Route path="/auth/callback" element={<CallbackPage />} />
        {isTauri && <Route path="/auth/tauri-callback" element={<TauriCallbackPage />} />}

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
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<OrderViewPage />} />
          <Route path="orders/:orderId" element={<OrderViewPage />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductViewPage />} />
          <Route path="products/:productId" element={<ProductViewPage />} />
        </Route>

        {/* Root redirect - go to sign in */}
        <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />

        {/* Catch all other routes */}
        <Route path="*" element={<Navigate to="/auth/sign-in" replace />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  const activeThemeValue = localStorage.getItem("active_theme") || "default";

  return (
    <ThemeProvider attribute="class" defaultTheme="blue" enableSystem disableTransitionOnChange enableColorScheme>
      <Providers activeThemeValue={activeThemeValue}>
        <ThemedAppContent />
      </Providers>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NuqsAdapter>
        <AppContent />
      </NuqsAdapter>
    </BrowserRouter>
  );
}

export default App;
