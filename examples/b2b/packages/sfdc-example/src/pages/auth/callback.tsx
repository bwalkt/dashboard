import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { User } from '@/types'

const CallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'callback'],
    queryFn: async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      if (!code || !state) {
        navigate('/auth/sign-in', { replace: true })
        toast.error('Invalid auth state')
        return null
      }

      try {
        console.log('Calling auth callback with code:', code, 'state:', state)
        const data = await api.get<{ user: User; message: string }>(
          `/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        )
        console.log('Auth callback response:', data)

        if (data?.user?.id) {
          // Invalidate user query to refetch user data in AuthContext
          queryClient.invalidateQueries({ queryKey: ['user'] })
          // Navigate directly to dashboard overview
          toast.success('Login successful!')
          navigate('/dashboard/overview', { replace: true })
        }
        return data
      } catch (error) {
        console.error('Auth callback error:', error)
        toast.error('Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        navigate('/auth/sign-in', { replace: true })
        throw error
      }
    },
    retry: false,
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return <div>Welcome {data?.user.name}</div>
}

export default CallbackPage
