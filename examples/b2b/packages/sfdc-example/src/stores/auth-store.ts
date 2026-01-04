import { decryptGrid } from '@pzero/shared/utils/crypto'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { AUTH_STALE_TIME_MS } from '@/lib/constants'
import { User } from '@/types'

interface AuthState {
  user: User | null
  decryptedGrid: number[][] | null // Decrypted grid stored only in memory
  lastFetched: number | null

  // Actions
  setUser: (user: User | null, encryptionSecret?: string) => void
  clearUser: () => void
  updateLastFetched: () => void

  // Helpers
  isStale: () => boolean
  getDecryptedGrid: () => number[][] | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      decryptedGrid: null,
      lastFetched: null,

      setUser: async (user, encryptionSecret) => {
        let decryptedGrid = null

        // If user has encrypted grid data and secret is provided, decrypt it
        if (user?.data?.grid && encryptionSecret) {
          try {
            decryptedGrid = await decryptGrid(user.data.grid, encryptionSecret)
          } catch (error) {
            console.warn('Failed to decrypt grid:', error)
          }
        }

        set({
          user,
          decryptedGrid, // Store decrypted grid in memory only
          lastFetched: user ? Date.now() : null,
        })
      },

      clearUser: () =>
        set({
          user: null,
          decryptedGrid: null,
          lastFetched: null,
        }),

      updateLastFetched: () => set({ lastFetched: Date.now() }),

      isStale: () => {
        const { lastFetched } = get()
        if (!lastFetched) return true
        return Date.now() - lastFetched > AUTH_STALE_TIME_MS
      },

      getDecryptedGrid: () => get().decryptedGrid,
    }),
    {
      name: 'auth-storage', // name of item in storage
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // Only persist user data (with encrypted grid) and lastFetched
        // NEVER persist decryptedGrid to localStorage
        user: state.user, // This contains the encrypted grid in user.data.grid
        lastFetched: state.lastFetched,
        // decryptedGrid is deliberately excluded from persistence
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
