import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type React from 'react'
import { useState } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ActiveThemeProvider } from '../active-theme'

export default function Providers({ activeThemeValue, children }: { activeThemeValue: string; children: React.ReactNode }) {
  // Create a client inside the component to ensure proper initialization
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ActiveThemeProvider initialTheme={activeThemeValue}>{children}</ActiveThemeProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
