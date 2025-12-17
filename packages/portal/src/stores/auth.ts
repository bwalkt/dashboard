import { useIdle } from '@mantine/hooks'
import type { User } from '@pzero/shared'
import { api } from '@pzero/shared/api'
import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ZStorage } from './store'

export const STORE = 'auth'
const INACTIVITY_TIMEOUT_MINUTES = parseInt(import.meta.env.VITE_NO_ACTIVITY_MINS || '30')
// Auth store state interface
interface AuthState {
  // Current user data
  user?: User | null
  loading: boolean
  lastActivity: number

  // Legacy fields for compatibility
  email?: string
  name: string
  phone?: string
  isPhoneVerified: boolean
  isEmailVerified: boolean
  isLoggedIn: boolean
  lastActiveAt?: number

  // Actions
  setUser: (user: User | null) => Promise<void>
  setLoading: (loading: boolean) => void
  updateLastActivity: () => Promise<void>
  updateUserAfterRegistration: (user: User) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  handleUserIdle: () => Promise<void>
  initializeStore: () => Promise<void>
}

// Create storage instance for persistence
const storage = new ZStorage(STORE)

// Create reactive Zustand store
const useAuthStoreBase = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      loading: true,
      lastActivity: Date.now(),
      email: undefined,
      name: '',
      phone: undefined,
      isPhoneVerified: false,
      isEmailVerified: false,
      isLoggedIn: false,
      lastActiveAt: undefined,

      // Actions
      setUser: async (user: User | null) => {
        const state = get()
        const isLoggedIn = !!user

        if (user) {
          const email = user.email
          const name = user.name || ''
          const isEmailVerified = user.email_verified || false
          const lastActiveAt = Date.now()

          // Update state
          set({
            user,
            isLoggedIn,
            email,
            name,
            isEmailVerified,
            lastActiveAt,
          })

          // Persist user data
          await storage.setItem({ key: 'user', data: user })
          await storage.setItem({
            key: 'legacy',
            data: {
              email,
              name,
              phone: state.phone,
              isPhoneVerified: state.isPhoneVerified,
              isEmailVerified,
              lastActiveAt,
            },
          })

          // Update activity
          await get().updateLastActivity()
        } else {
          // Clear state
          set({
            user: null,
            isLoggedIn: false,
            email: undefined,
            name: '',
            phone: undefined,
            isPhoneVerified: false,
            isEmailVerified: false,
            lastActiveAt: undefined,
          })

          // Clear persisted data
          await storage.removeItem('user')
          await storage.removeItem('legacy')
          await storage.removeItem('lastActivity')
        }
      },

      setLoading: (loading: boolean) => {
        set({ loading })
      },

      updateLastActivity: async () => {
        const now = Date.now()
        set({ lastActivity: now, lastActiveAt: now })
        await storage.setItem({ key: 'lastActivity', data: now })
      },

      updateUserAfterRegistration: async (user: User) => {
        console.log('AuthStore: Updating user after registration:', user)
        await get().setUser(user)
        await get().updateLastActivity()
      },

      logout: async () => {
        try {
          await api.post('/auth/logout', undefined, { skipRefresh: true })
        } catch (error) {
          console.error('AuthStore: Logout API error:', error)
        }

        // Clear all data
        await get().setUser(null)
        get().setLoading(false)

        // Redirect to sign-in
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/sign-in'
        }
      },

      checkAuth: async () => {
        get().setLoading(true)

        try {
          const response = await api.get<{ user: User }>('/auth/me')
          const { user } = response

          if (user) {
            await get().setUser(user)
          } else {
            await get().setUser(null)
          }
        } catch (error) {
          console.error('AuthStore: Auth check failed:', error)
          await get().setUser(null)
        } finally {
          get().setLoading(false)
        }
      },

      handleUserIdle: async () => {
        const state = get()
        if (!state.user) return
        console.log('AuthStore: User has been idle, logging out...')
        await state.logout()
      },

      initializeStore: async () => {
        try {
          console.log('AuthStore: Initializing...')

          // Load persisted data
          const userData = await storage.getItem('user')
          const lastActivity = await storage.getItem('lastActivity')
          const legacyData = await storage.getItem('legacy')

          let initialState: Partial<AuthState> = {}

          if (userData) {
            initialState.user = userData
            initialState.isLoggedIn = true
          }

          if (lastActivity) {
            initialState.lastActivity = lastActivity
          }

          if (legacyData) {
            initialState.email = legacyData.email
            initialState.name = legacyData.name || ''
            initialState.phone = legacyData.phone
            initialState.isPhoneVerified = legacyData.isPhoneVerified || false
            initialState.isEmailVerified = legacyData.isEmailVerified || false
            initialState.lastActiveAt = legacyData.lastActiveAt
          }

          // Update state with loaded data
          set(initialState)

          // Check if user should be logged out due to inactivity
          const state = get()
          if (state.user && state.lastActivity) {
            const timeSinceLastActivity = Date.now() - state.lastActivity
            const timeoutMs = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000
            if (timeSinceLastActivity >= timeoutMs) {
              console.log('AuthStore: User was inactive too long, logging out on page load...')
              await state.logout()
              return
            }
          }

          // If user exists, verify with server
          if (state.user) {
            await state.checkAuth()
          } else {
            state.setLoading(false)
          }

          console.log('AuthStore: Initialization complete')
        } catch (error) {
          console.error('AuthStore: Initialization failed:', error)
          get().setLoading(false)
        }
      },
    }),
    {
      name: STORE,
      storage: storage.zustandStorage,
      partialize: state => ({
        user: state.user,
        lastActivity: state.lastActivity,
        email: state.email,
        name: state.name,
        phone: state.phone,
        isPhoneVerified: state.isPhoneVerified,
        isEmailVerified: state.isEmailVerified,
        isLoggedIn: state.isLoggedIn,
        lastActiveAt: state.lastActiveAt,
      }),
    },
  ),
)

// Initialize the store on first use
let isInitialized = false

// React hook for using AuthStore in components with idle detection
export function useAuthStore() {
  const authStore = useAuthStoreBase()

  // Initialize store on first use
  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true
      authStore.initializeStore()
    }
  }, [authStore])

  const idle = useIdle(INACTIVITY_TIMEOUT_MINUTES * 60 * 1000, {
    events: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
    initialState: false,
  })

  useEffect(() => {
    if (idle && authStore.user) {
      authStore.handleUserIdle()
    }
  }, [idle, authStore])

  // Update last activity when user becomes active again
  useEffect(() => {
    if (!idle && authStore.user) {
      authStore.updateLastActivity()
    }
  }, [idle, authStore])

  return authStore
}

// Export for backward compatibility
export const AuthStore = {
  get user() {
    return useAuthStoreBase.getState().user
  },
  get loading() {
    return useAuthStoreBase.getState().loading
  },
  get isLoggedIn() {
    return useAuthStoreBase.getState().isLoggedIn
  },
  // Add other getters as needed for backward compatibility
}
