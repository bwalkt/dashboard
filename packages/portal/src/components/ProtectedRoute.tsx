import type React from 'react'
import { Navigate, useRouter } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Restricts access to its children to authenticated users, rendering a centered spinner while the authentication state is loading and redirecting unauthenticated users to the sign-in page.
 *
 * @param children - The content to render when a user is authenticated.
 * @returns The protected content (`children`) when authenticated; a centered loading spinner while auth state is loading; otherwise a `Navigate` element redirecting to `/auth/sign-in` with the current location saved in state.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    // Redirect to sign in page
    return <Navigate to="/auth/sign-in" replace />
  }

  return <>{children}</>
}
