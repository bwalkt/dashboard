'use client'

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

/**
 * Provides theme context to its descendant components by rendering NextThemesProvider with the supplied props.
 *
 * @param children - React nodes to receive the theme context
 * @param props - Additional ThemeProviderProps forwarded to NextThemesProvider to configure theme behavior
 * @returns A React element that provides theme context to its children
 */
export default function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
