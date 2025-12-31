/**
 * Utility functions for managing USE_PROXY configuration in localStorage
 */

const USE_PROXY_STORAGE_KEY = 'use_proxy'
const USE_WASM_STORAGE_KEY = 'use_wasm'

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
 * Generic getter for boolean localStorage values with env fallback
 * @param storageKey - localStorage key to read from
 * @param envValue - environment variable value as fallback
 * @param configName - name of the configuration for logging
 * @returns boolean value from localStorage or environment
 */
function getBooleanConfig(storageKey: string, envValue: string | undefined, configName: string): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn(`localStorage is not available, falling back to environment variable for ${configName}`)
    return envValue === 'true'
  }

  try {
    const stored = localStorage.getItem(storageKey)
    if (stored !== null) {
      return stored === 'true'
    }
  } catch (error) {
    console.error(`Error reading ${configName} from localStorage:`, error)
  }

  return envValue === 'true'
}

/**
 * Generic setter for boolean localStorage values
 * @param storageKey - localStorage key to write to
 * @param value - boolean value to store
 * @param configName - name of the configuration for logging
 * @returns boolean indicating if the operation was successful
 */
function setBooleanConfig(storageKey: string, value: boolean, configName: string): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn(`localStorage is not available, cannot save ${configName}`)
    return false
  }

  try {
    localStorage.setItem(storageKey, value.toString())
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error(`localStorage quota exceeded, cannot save ${configName}`)
    } else {
      console.error(`Error writing ${configName} to localStorage:`, error)
    }
    return false
  }
}

/**
 * Get the USE_PROXY value from localStorage, falling back to environment variable
 * @returns boolean indicating whether to use proxy
 */
export function getUseProxy(): boolean {
  return getBooleanConfig(USE_PROXY_STORAGE_KEY, import.meta.env.VITE_USE_PROXY, 'proxy setting')
}

/**
 * Set the USE_PROXY value in localStorage
 * @param value - boolean indicating whether to use proxy
 * @returns boolean indicating if the operation was successful
 */
export function setUseProxy(value: boolean): boolean {
  return setBooleanConfig(USE_PROXY_STORAGE_KEY, value, 'proxy setting')
}

/**
 * Get the USE_WASM value from localStorage, falling back to environment variable
 * @returns boolean indicating whether to use WASM
 */
export function getUseWasm(): boolean {
  return getBooleanConfig(USE_WASM_STORAGE_KEY, import.meta.env.VITE_USE_WASM, 'WASM setting')
}

/**
 * Set the USE_WASM value in localStorage
 * @param value - boolean indicating whether to use WASM
 * @returns boolean indicating if the operation was successful
 */
export function setUseWasm(value: boolean): boolean {
  return setBooleanConfig(USE_WASM_STORAGE_KEY, value, 'WASM setting')
}

/**
 * Initialize proxy and WASM settings in localStorage from environment variables if not already set
 * This should be called before any API requests are made
 */
export function initializeProxySettings(): void {
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

    if (localStorage.getItem(USE_WASM_STORAGE_KEY) === null) {
      const envValue = import.meta.env.VITE_USE_WASM === 'true'
      const success = setUseWasm(envValue)
      if (!success) {
        console.warn('Failed to initialize USE_WASM in localStorage, using environment variable')
      }
    }
  } catch (error) {
    console.error('Error initializing proxy settings in localStorage:', error)
  }
}
