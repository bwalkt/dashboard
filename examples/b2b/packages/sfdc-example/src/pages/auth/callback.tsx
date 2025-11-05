import { User } from '@pzero/shared'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'

const CallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'callback'],
    queryFn: () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      if (!code || !state) {
        navigate('/auth/sign-in', { replace: true })
        toast.error('Invalid auth state')
        return null
      }
      return api.get<{ user: User, accessToken: string, refreshToken: string, message: string }>(`/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        { skipAuth: true }
      )
    },
  })

  React.useEffect(() => {
    if (data) {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      navigate('/dashboard/overview', { replace: true })
    }
  }, [data, navigate])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }



  return (
    <div>Welcome {data?.user.name}</div>
  )
}

export default CallbackPage