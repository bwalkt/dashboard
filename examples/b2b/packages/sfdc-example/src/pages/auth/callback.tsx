import { api } from '@/lib/api'
import { User } from '@pzero/shared'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const CallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'callback'],
    queryFn: () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      return api.get<{ user: User, message: string }>(`/auth/callback?code=${code}&state=${state}`)
    },
  })

  React.useEffect(() => {
    if (data?.user) {
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