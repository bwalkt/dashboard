import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type React from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ActiveThemeProvider } from '../active-theme'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Wraps the application subtree with React Query, authentication, theme, and devtools providers.
 *
 * @param activeThemeValue - Initial theme value passed to the ActiveThemeProvider
 * @param children - React nodes rendered inside the ActiveThemeProvider
 * @returns The provider-wrapped React element tree
 */
export default function Providers({
  activeThemeValue,
  children,
}: {
  activeThemeValue: string
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ActiveThemeProvider initialTheme={activeThemeValue}>{children}</ActiveThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
