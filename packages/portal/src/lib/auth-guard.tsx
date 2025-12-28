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

  while (AuthStore.loading && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }

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
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
)
