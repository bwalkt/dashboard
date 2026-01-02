import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { AUTH_STALE_TIME_MS } from '@/lib/constants'
import { User } from '@/types'

interface AuthState {
  user: User | null
  lastFetched: number | null

  // Actions
  setUser: (user: User | null) => void
  clearUser: () => void
  updateLastFetched: () => void

  // Helpers
  isStale: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      lastFetched: null,

      setUser: user =>
        set({
          user,
          lastFetched: user ? Date.now() : null,
        }),

      clearUser: () =>
        set({
          user: null,
          lastFetched: null,
        }),

      updateLastFetched: () => set({ lastFetched: Date.now() }),

      isStale: () => {
        const { lastFetched } = get()
        if (!lastFetched) return true
        return Date.now() - lastFetched > AUTH_STALE_TIME_MS
      },
    }),
    {
      name: 'auth-storage', // name of item in storage
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // Only persist user data and lastFetched, not loading state
        user: state.user,
        lastFetched: state.lastFetched,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Failed to rehydrate auth state from localStorage:', error)
          // State will remain at initial values if rehydration fails
        }
      },
    },
  ),
)
