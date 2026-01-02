import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError, api } from '@/lib/api'
import { AUTH_CACHE_TIME_MS, AUTH_STALE_TIME_MS } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import { User } from '@/types'

export function useUser() {
  const { user, setUser, clearUser, isStale } = useAuthStore()

  // Use React Query to fetch user, but integrate with zustand store
  const {
    data,
    isLoading: queryLoading,
    error,
    refetch,
  } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const { user } = await api.get<{ user: User }>('/auth/me', {
        headers: {
          'X-Client-Type': 'web',
        },
      })
      return user
    },
    // Only fetch if we don't have data or it's stale
    enabled: !user || isStale(),
    retry: false,
    staleTime: AUTH_STALE_TIME_MS,
    gcTime: AUTH_CACHE_TIME_MS,
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
      clearUser() // Clear zustand store
      return { error: null }
    },
    onSuccess: () => {
      window.location.href = '/auth/sign-in'
    },
    onError: error => {
      console.error(error)
    },
  })

  // Sync zustand store with query data
  useEffect(() => {
    // Always sync fresh query data to store
    if (data) {
      setUser(data)
    }
  }, [data, setUser])

  // Handle auth errors by clearing user
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      clearUser()
    }
  }, [error, clearUser])

  // Prioritize fresh query data over store to avoid stale renders
  const currentUser = data ?? user

  return {
    data: currentUser,
    isLoading: queryLoading,
    error: error instanceof ApiError && error.status !== 401 ? error : null, // Don't expose 401 as error (handled via clearUser)
    signOut,
    signOutLoading,
    signOutError,
    refetch, // Allow manual refetch if needed
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
