import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

const COOKIE_NAME = 'active_theme'
const DEFAULT_THEME = 'default'

/**
 * Persist the given theme identifier in a cookie and in localStorage for client-side use.
 *
 * This is a no-op in non-browser environments (when `window` is undefined). In browsers it sets
 * a cookie named `active_theme` with path `/`, max-age of one year, `SameSite=Lax`, and `Secure`
 * when using HTTPS, and stores the same value under `active_theme` in localStorage.
 *
 * @param theme - The theme identifier to persist (e.g., `"default"`, `"dark"`, `"light-scaled"`)
 */
function setThemeCookie(theme: string) {
  if (typeof window === 'undefined') return

  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`
  localStorage.setItem(COOKIE_NAME, theme)
}

type ThemeContextType = {
  activeTheme: string
  setActiveTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Provides theme context to descendants and manages the active theme for the application.
 *
 * The provider persists the active theme (cookie and localStorage) and updates document body classes so consuming UI reflects the current theme.
 *
 * @param children - Child elements that will receive theme context
 * @param initialTheme - Optional initial theme to use; defaults to `DEFAULT_THEME` when not provided
 * @returns A React provider element that supplies `activeTheme` and `setActiveTheme` to descendants
 */
export function ActiveThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme?: string }) {
  const [activeTheme, setActiveTheme] = useState<string>(() => initialTheme || DEFAULT_THEME)

  useEffect(() => {
    setThemeCookie(activeTheme)

    Array.from(document.body.classList)
      .filter(className => className.startsWith('theme-'))
      .forEach(className => {
        document.body.classList.remove(className)
      })

    document.body.classList.add(`theme-${activeTheme}`)

    if (activeTheme.endsWith('-scaled')) {
      document.body.classList.add('theme-scaled')
    }
  }, [activeTheme])

  return <ThemeContext.Provider value={{ activeTheme, setActiveTheme }}>{children}</ThemeContext.Provider>
}

/**
 * Retrieves the current theme context value for the active theme and updater.
 *
 * @returns The context value with `activeTheme` and `setActiveTheme`.
 * @throws Error if called outside an ActiveThemeProvider.
 */
export function useThemeConfig() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeConfig must be used within an ActiveThemeProvider')
  }
  return context
}
