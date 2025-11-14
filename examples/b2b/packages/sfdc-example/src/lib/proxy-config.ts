/**
 * Utility functions for managing USE_PROXY configuration in localStorage
 */

const USE_PROXY_STORAGE_KEY = 'use_proxy';

/**
 * Get the USE_PROXY value from localStorage, falling back to environment variable
 * @returns boolean indicating whether to use proxy
 */
export function getUseProxy(): boolean {
  // Check localStorage first
  const stored = localStorage.getItem(USE_PROXY_STORAGE_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  
  // Fall back to environment variable
  return import.meta.env.VITE_USE_PROXY === 'true';
}

/**
 * Set the USE_PROXY value in localStorage
 * @param value - boolean indicating whether to use proxy
 */
export function setUseProxy(value: boolean): void {
  localStorage.setItem(USE_PROXY_STORAGE_KEY, value.toString());
}

/**
 * Initialize USE_PROXY in localStorage from environment variable if not already set
 * This should be called before any API requests are made
 */
export function initializeUseProxy(): void {
  if (localStorage.getItem(USE_PROXY_STORAGE_KEY) === null) {
    const envValue = import.meta.env.VITE_USE_PROXY === 'true';
    setUseProxy(envValue);
  }
}

