import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useUser } from '@/hooks/use-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: user, isLoading } = useUser()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    // Redirect to sign in page with return url
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />
  }

  return <>{children}</>
}
