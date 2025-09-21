// Platform detection utilities
export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

export const isMobile = () => {
  return isTauri() && (window.__TAURI_METADATA__?.target?.includes('mobile') || 
                       window.__TAURI_METADATA__?.target?.includes('ios') ||
                       window.__TAURI_METADATA__?.target?.includes('android'));
};

export const isWeb = () => {
  return !isTauri();
};

// Safe localStorage wrapper for mobile environments
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage?.getItem(key) || null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage?.setItem(key, value);
    } catch {
      // Ignore errors in mobile environment
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage?.removeItem(key);
    } catch {
      // Ignore errors in mobile environment
    }
  }
};