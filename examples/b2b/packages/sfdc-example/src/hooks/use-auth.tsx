import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError, api } from '@/lib/api'
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
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
    // Only update if we have new data and it's different (by ID)
    if (data && (!user || data.id !== user.id || data.email !== user.email)) {
      setUser(data)
    }
  }, [data, user, setUser])

  // Handle auth errors by clearing user
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      clearUser()
    }
  }, [error, clearUser])

  // Use store user if available, otherwise use query data
  const currentUser = user || data

  return {
    data: currentUser,
    isLoading: queryLoading,
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

// Export a hook to access just the auth store directly if needed
export function useAuthStoreDirectly() {
  return useAuthStore()
}
