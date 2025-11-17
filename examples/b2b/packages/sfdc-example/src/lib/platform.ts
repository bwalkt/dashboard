// Platform detection utilities
export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined
}

export const isMobile = () => {
  const tauri = isTauri()
  const metadata = (window as any).__TAURI_METADATA__
  const target = metadata?.target

  // Fallback detection methods
  const userAgent = navigator?.userAgent || ''
  const isMobileUA = /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent)
  const isTauriMobile = tauri && (target?.includes('mobile') || target?.includes('ios') || target?.includes('android'))

  // For Tauri apps, use mobile if either metadata indicates mobile OR user agent suggests mobile
  return tauri && (isTauriMobile || isMobileUA)
}

export const isWeb = () => {
  return !isTauri()
}

// Safe localStorage wrapper for mobile environments
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage?.getItem(key) || null
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage?.setItem(key, value)
    } catch {
      // Ignore errors in mobile environment
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage?.removeItem(key)
    } catch {
      // Ignore errors in mobile environment
    }
  },
}
