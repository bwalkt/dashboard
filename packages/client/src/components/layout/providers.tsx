import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ActiveThemeProvider } from "../active-theme";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function Providers({ activeThemeValue, children }: { activeThemeValue: string; children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ActiveThemeProvider initialTheme={activeThemeValue}>{children}</ActiveThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
