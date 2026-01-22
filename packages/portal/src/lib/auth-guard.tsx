import { redirect } from '@tanstack/react-router'
import React from 'react'
import { AuthStore } from '@/stores/auth'

/**
 * Reusable authentication guard for protected routes.
 * Waits for auth store to initialize and redirects to sign-in if user is not authenticated.
 */
export async function requireAuth({ location }: { location: { href: string } }) {
  // Wait for auth check if loading
  let attempts = 0
  const maxAttempts = 50 // 5 seconds max wait
  const pollInterval = 100 // ms

  while (AuthStore.loading && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    attempts++
  }

  // Handle timeout case
  if (attempts >= maxAttempts && AuthStore.loading) {
    console.error('Auth check timed out after 5 seconds')
    // Still loading after timeout - likely a network issue
    // Redirect to sign-in with error message
    throw redirect({
      to: '/auth/sign-in',
      search: {
        redirect: location.href,
        error: 'auth_timeout',
      },
    })
  }

  // Add small delay to ensure state consistency after loading completes
  await new Promise(resolve => setTimeout(resolve, 50))

  // Check if user is authenticated
  if (!AuthStore.user) {
    throw redirect({
      to: '/auth/sign-in',
      search: {
        redirect: location.href,
      },
    })
  }
}

/**
 * Standard loading component for pending auth checks
 */
export const AuthLoadingComponent = () => (
  <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
    <div
      className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"
      aria-label="Loading authentication"
    ></div>
    <span className="sr-only">Checking authentication status...</span>
  </div>
)
