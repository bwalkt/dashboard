import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { User } from '@/types'

export function useUser() {
  const { data, isLoading } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const { user } = await api.get<{ user: User }>('/auth/me', {
        headers: {
          'X-Client-Type': 'web',
        },
      })
      return user
    },
    retry: false,
  })

  const queryClient = useQueryClient()

  const {
    mutateAsync: signOut,
    isPending: signOutLoading,
    error: signOutError,
  } = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout', undefined, { skipRefresh: true })
      queryClient.clear()
      return { error: null }
    },
    onSuccess: () => {
      window.location.href = '/auth/sign-in'
    },
    onError: error => {
      console.error(error)
    },
  })

  return {
    data,
    isLoading,
    signOut,
    signOutLoading,
    signOutError,
  }
}

export function useAuth() {
  const { mutateAsync: signInWithGitHub, isPending: signInWithGitHubLoading } = useMutation<{
    data: string
    error: any
  }>({
    mutationFn: async () => {
      const { authUrl } = await api.get<{ authUrl: string; state: string }>('/auth/login')
      return { data: authUrl, error: null }
    },
    onSuccess: ({ data }) => {
      window.location.href = data
    },
    onError: error => {
      console.error(error)
    },
  })

  return {
    signInWithGitHub,
    signInWithGitHubLoading,
  }
}
