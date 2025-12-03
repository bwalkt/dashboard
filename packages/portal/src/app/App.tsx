// @ts-expect-error no declaration file
import NProgress from 'nprogress'
import { useThemeConfig } from '@/components/active-theme'
import Providers from '@/components/layout/providers'
import ThemeProvider from '@/components/layout/ThemeToggle/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { fontVariables } from '@/lib/font'
import { cn } from '@/lib/utils'
import 'nprogress/nprogress.css'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { useEffect } from 'react'
import { AppWrapper } from '@/components/AppWrapper'
import { TauriAuthListener } from '@/components/TauriAuthListener'
import { AppRouter } from '@/router'
import { DevicesStore } from '@/stores/devices'
import { PostHogProviderWrapper } from './posthog-provider'
// Import all CSS styles
import '@/styles/globals.css'
import '@/styles/theme.css'

// Configure NProgress
NProgress.configure({ showSpinner: false })

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
      <TauriAuthListener />
      <AppWrapper>
        <AppRouter />
      </AppWrapper>
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
  useEffect(() => {
    const initializeDevicesStore = async () => {
      try {
        console.log('App: Initializing DevicesStore...')
        await DevicesStore.init()
        console.log('App: DevicesStore initialized successfully')
        console.log('Current Device in App:', DevicesStore.currentDevice)

        // Force regeneration to trigger debugger
        console.log('App: Force regenerating device info to trigger debugger...')
        await DevicesStore.forceRegenerateDeviceInfo()
        console.log('App: Force regeneration complete')
        console.log('Updated Device in App:', DevicesStore.currentDevice)
      } catch (error) {
        console.error('App: Failed to initialize DevicesStore:', error)
      }
    }

    initializeDevicesStore()
  }, [])

  return (
    <PostHogProviderWrapper>
      <NuqsAdapter>
        <AppContent />
      </NuqsAdapter>
    </PostHogProviderWrapper>
  )
}

export default App
