import type { User } from '@pzero/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import { createContext, useContext } from 'react'
import { api } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGitHub: () => Promise<{ data: string; error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Provides authentication context to descendants and manages current user, loading state, and login/logout actions.
 *
 * @returns A React element that renders AuthContext.Provider supplying `{ user, loading, signInWithGitHub, signOut }` to its children
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const { user } = await api.get<{ user: User }>('/auth/me')
      return user
    },
    retry: false,
  })

  const { mutateAsync: signInWithGitHub } = useMutation<{ data: string; error: any }>({
    mutationFn: async () => {
      const { authUrl } = await api.get<{ authUrl: string }>('/auth/login')
      return { data: authUrl, error: null }
    },
    onSuccess: ({ data }) => {
      window.location.href = data
    },
    onError: error => {
      console.error(error)
    },
  })

  const { mutateAsync: signOut } = useMutation({
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

  const value = {
    user: user ?? null,
    loading: isLoading,
    signInWithGitHub,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Retrieves the current authentication context for the calling component.
 *
 * @returns The `AuthContextType` value containing `user`, `loading`, `signInWithGitHub`, and `signOut`.
 * @throws An `Error` if the hook is used outside of an `AuthProvider`.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
