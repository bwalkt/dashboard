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
      const data = await api.get<{ user: User; message: string }>(
        `/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      )
      if (data?.user.id) {
        // Invalidate user query to refetch user data in AuthContext
        queryClient.invalidateQueries({ queryKey: ['user'] })
        // Navigate directly to dashboard overview
        navigate('/dashboard/overview')
      }
      return data
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
