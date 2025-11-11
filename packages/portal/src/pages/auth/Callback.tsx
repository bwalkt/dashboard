import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

export default function AuthCallback() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    // OAuth callback will be handled by the server at /auth/callback
    // Server sets cookies and redirects here
    // We just need to invalidate the user query to refetch with new cookies
    queryClient.invalidateQueries({ queryKey: ['user'] })
    
    // Navigate to dashboard
    navigate('/dashboard/overview', { replace: true })
  }, [navigate, queryClient])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Authenticating...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  )
}