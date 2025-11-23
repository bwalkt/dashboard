import { api } from '@pzero/shared/api'
import { useMutation } from '@tanstack/react-query'

/**
 * Starts a GitHub sign-in flow by requesting an OAuth URL from the backend and navigating the browser to it.
 *
 * Triggers a backend call to obtain the authentication URL and then redirects the window to that URL. Exposes a trigger to start the flow, a loading flag, and any error message.
 *
 * @returns An object containing:
 * - `signInWithGitHub`: function to initiate the sign-in process
 * - `isLoading`: boolean that is `true` while the request is in progress
 * - `error`: error message string if an error occurred, otherwise `null`
 */
export function useTauriAuth() {
  const {
    mutateAsync: signInWithGitHub,
    isPending: isLoading,
    error,
  } = useMutation({
    mutationFn: async () => {
      const { authUrl } = await api.get<{ authUrl: string }>('/auth/login')
      // Redirect to GitHub; backend callback will set cookies then redirect to app home
      window.location.href = authUrl
      return { success: true }
    },
    onError: error => {
      console.error('Tauri auth error:', error)
    },
  })

  return {
    signInWithGitHub,
    isLoading,
    error: error?.message || null,
  }
}
