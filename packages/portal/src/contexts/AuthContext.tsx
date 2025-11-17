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
  signUp: (data: { email: string; name: string }) => Promise<any>
  signIn: (data: { email: string }) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Provides authentication context to descendants and manages current user, loading state, and authentication actions.
 *
 * @returns A React element that renders AuthContext.Provider supplying `{ user, loading, signInWithGitHub, signOut, signUp, signIn }` to its children
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
  const signUpMutation = useMutation({
    mutationFn: async (data: { email: string; name: string }) => {
      const response = await api.post<{ message: string }>('/auth/register', data)
      return response
    },
  })

  const { mutateAsync: signIn } = useMutation({
    mutationFn: async (data: { email: string}) => {
      const response = await api.post('/auth/login', data)
      return response.data
    },
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
    signUp: signUpMutation.mutateAsync,
    signIn,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Retrieves the current authentication context for the calling component.
 *
 * @returns The `AuthContextType` value containing:
 *   - `user`: Current authenticated user or null
 *   - `loading`: Boolean indicating if auth state is being loaded
 *   - `signInWithGitHub`: Function to initiate GitHub OAuth sign-in
 *   - `signOut`: Function to sign out current user
 *   - `signUp`: Function to register new user with email and name
 *   - `signIn`: Function to sign in existing user with email
 * @throws An `Error` if the hook is used outside of an `AuthProvider`.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
