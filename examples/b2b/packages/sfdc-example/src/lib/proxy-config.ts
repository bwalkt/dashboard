/**
 * Utility functions for managing USE_PROXY configuration in localStorage
 */

const USE_PROXY_STORAGE_KEY = 'use_proxy'

/**
 * Check if localStorage is available
 * @returns boolean indicating if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Get the USE_PROXY value from localStorage, falling back to environment variable
 * @returns boolean indicating whether to use proxy
 */
export function getUseProxy(): boolean {
  // Check if localStorage is available
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, falling back to environment variable')
    return import.meta.env.VITE_USE_PROXY === 'true'
  }

  try {
    // Check localStorage first
    const stored = localStorage.getItem(USE_PROXY_STORAGE_KEY)
    if (stored !== null) {
      return stored === 'true'
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error)
  }

  // Fall back to environment variable
  return import.meta.env.VITE_USE_PROXY === 'true'
}

/**
 * Set the USE_PROXY value in localStorage
 * @param value - boolean indicating whether to use proxy
 * @returns boolean indicating if the operation was successful
 */
export function setUseProxy(value: boolean): boolean {
  // Check if localStorage is available
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, cannot save proxy setting')
    return false
  }

  try {
    localStorage.setItem(USE_PROXY_STORAGE_KEY, value.toString())
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded, cannot save proxy setting')
    } else {
      console.error('Error writing to localStorage:', error)
    }
    return false
  }
}

/**
 * Initialize USE_PROXY in localStorage from environment variable if not already set
 * This should be called before any API requests are made
 */
export function initializeUseProxy(): void {
  // Check if localStorage is available
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, skipping initialization')
    return
  }

  try {
    if (localStorage.getItem(USE_PROXY_STORAGE_KEY) === null) {
      const envValue = import.meta.env.VITE_USE_PROXY === 'true'
      const success = setUseProxy(envValue)
      if (!success) {
        console.warn('Failed to initialize USE_PROXY in localStorage, using environment variable')
      }
    }
  } catch (error) {
    console.error('Error initializing USE_PROXY in localStorage:', error)
  }
}
