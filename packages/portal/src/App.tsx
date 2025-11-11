// @ts-expect-error no declaration file
import NProgress from 'nprogress'
import { useThemeConfig } from '@/components/active-theme'
import Providers from '@/components/layout/providers'
import ThemeProvider from '@/components/layout/ThemeToggle/theme-provider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Toaster } from '@/components/ui/sonner'
import { fontVariables } from '@/lib/font'
import { cn } from '@/lib/utils'
import 'nprogress/nprogress.css'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

// Import all CSS styles
import '@/styles/globals.css'
import '@/styles/theme.css'

// Import pages
import AuthCallback from "./pages/auth/Callback";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import MobileDashboardLayout from "./pages/dashboard/MobileLayout";
import Overview from "./pages/dashboard/Overview";

// Configure NProgress
NProgress.configure({ showSpinner: false })

/**
 * Starts and completes the global top progress indicator whenever the current route pathname changes.
 *
 * This component has no visual output and exists solely to trigger NProgress on navigation.
 *
 * @returns `null` — the component renders nothing
 */
function ProgressBar() {
  const location = useLocation()

  useEffect(() => {
    NProgress.start()
    NProgress.done()
  }, [location.pathname])

  return null
}

/**
 * Render the themed application shell with notification UI, global progress indicator, and route configuration.
 *
 * The rendered wrapper applies the active theme and optional scaled variant, mounts the Toaster and ProgressBar,
 * and defines routes for authentication and a protected dashboard (including overview, orders, and products).
 *
 * @returns A React element containing the themed application wrapper with notification/toast, progress bar, and configured routes for auth and the protected dashboard.
 */
function ThemedAppContent() {
  const { activeTheme } = useThemeConfig()
  const isScaled = activeTheme?.endsWith('-scaled')

  return (
    <div
      className={cn(
        'bg-background min-h-screen font-sans antialiased',
        `theme-${activeTheme}`,
        isScaled ? 'theme-scaled' : '',
        fontVariables,
      )}
    >
      <Toaster />
      <ProgressBar />
      <Routes>
        {/* Auth routes - no authentication required */}
        <Route path="/auth/callback" element={<AuthCallback />} />
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
         
        </Route>

        {/* Root redirect - go to sign in */}
        <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />

        {/* Catch all other routes */}
        <Route path="*" element={<Navigate to="/auth/sign-in" replace />} />
      </Routes>
    </div>
  )
}

/**
 * Wraps the application content with theme and provider contexts using the persisted active theme.
 *
 * Reads the `active_theme` value from localStorage (falls back to `"default"`) and renders
 * ThemeProvider configured for class-based theming and Providers with that active theme value.
 *
 * @returns The application content wrapped by ThemeProvider and Providers using the persisted active theme.
 */
function AppContent() {
  const activeThemeValue = localStorage.getItem('active_theme') || 'default'

  return (
    <ThemeProvider attribute="class" defaultTheme="blue" enableSystem disableTransitionOnChange enableColorScheme>
      <Providers activeThemeValue={activeThemeValue}>
        <ThemedAppContent />
      </Providers>
    </ThemeProvider>
  )
}

/**
 * Renders the top-level application entrypoint with routing and Nuqs integration.
 *
 * @returns The root React element for the admin portal, wrapped with the router and Nuqs adapter.
 */
function App() {
  return (
    <BrowserRouter>
      <NuqsAdapter>
        <AppContent />
      </NuqsAdapter>
    </BrowserRouter>
  )
}

export default App
