import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError, api } from '@/lib/api'
import { AUTH_CACHE_TIME_MS, AUTH_STALE_TIME_MS } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import { User } from '@/types'

/**
 * Synchronizes and exposes the current authenticated user from React Query and the auth store, and provides sign-out and refetch controls.
 *
 * @returns An object containing:
 * - `data` — The authenticated user if available, otherwise `undefined`.
 * - `isLoading` — `true` when either the query or the auth store is loading, otherwise `false`.
 * - `signOut` — A function that signs out the current user.
 * - `signOutLoading` — `true` while the sign-out mutation is in progress, otherwise `false`.
 * - `signOutError` — The error produced by the sign-out mutation, if any.
 * - `refetch` — A function to manually refetch the user data.
 */
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
      console.log('Calling logout API...')
      try {
        const response = await api.post('/auth/logout', undefined, { skipRefresh: true })
        console.log('Logout API response:', response)
        queryClient.clear()
        clearUser() // Clear zustand store
        return { error: null }
      } catch (error) {
        console.error('Logout API error:', error)
        throw error
      }
    },
    onSuccess: () => {
      console.log('Logout successful, redirecting...')
      window.location.href = '/auth/sign-in'
    },
    onError: error => {
      console.error('Logout mutation error:', error)
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

/**
 * Initiates the GitHub OAuth sign-in flow by requesting an authorization URL and redirecting the browser to it.
 *
 * @returns An object containing:
 * - `signInWithGitHub` — Function that requests the provider authorization URL and navigates the browser to that URL when successful.
 * - `signInWithGitHubLoading` — `true` if the sign-in request is in progress, `false` otherwise.
 */
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

/**
 * Provide direct access to the authentication store.
 *
 * @returns The auth store instance used to read and update authentication state.
 */
export function useAuthStoreDirectly() {
  return useAuthStore()
}
