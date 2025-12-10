import { useIdle } from '@mantine/hooks'
import type { User } from '@pzero/shared'
import { api } from '@pzero/shared/api'
import { useEffect, useState } from 'react'
import { ZStorage } from './store'

export const STORE = 'auth'

const INACTIVITY_TIMEOUT_MINUTES = parseInt(import.meta.env.VITE_NO_ACTIVITY_MINS || '30')

export class AuthStoreClass extends ZStorage {
  // Current user data
  user?: User | null = null
  loading: boolean = true
  lastActivity: number = Date.now()

  // Legacy fields for compatibility
  email?: string
  name: string = ''
  phone?: string
  isPhoneVerified: boolean = false
  isEmailVerified: boolean = false
  isLoggedIn: boolean = false
  lastActiveAt?: number

  // Listeners for state changes
  private listeners: Set<() => void> = new Set()

  constructor() {
    super(STORE)
    // Start with loading true during initialization
    this.loading = true
    this.initializeAuth()
  }

  private async initializeAuth() {
    try {
      // First, load any persisted user data
      await this.loadPersistedData()

      // If we have a persisted user, we're not loading anymore
      if (this.user) {
        this.loading = false
        this.notify()
      }

      // Then check with server to validate/refresh auth
      await this.checkAuthWithTimeout()
    } catch (error) {
      console.error('AuthStore: Failed to initialize auth:', error)
      this.loading = false
      this.user = null
      this.isLoggedIn = false
      this.notify()
    }
  }

  // Subscribe to state changes
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Notify all listeners of state changes
  private notify() {
    this.listeners.forEach(listener => listener())
  }

  private async initializeStore() {
    try {
      console.log('AuthStore: Initializing...')

      // Add timeout to prevent hanging on IndexedDB operations
      const initializationTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Store initialization timeout')), 3000)
      })

      // Check if user should be logged out due to inactivity
      await this.checkInactivityOnLoad()

      // If user exists, verify with server
      if (this.user) {
        // Add timeout to prevent hanging
        await Promise.race([
          this.checkAuth(),
          new Promise<void>(resolve => {
            setTimeout(() => {
              console.warn('AuthStore: checkAuth timed out after 10 seconds')
              resolve()
            }, 10000)
          }),
        ])
      }
      await Promise.race([this.doInitialization(), initializationTimeout])

      // Always set loading to false, even if checkAuth hangs
      this.setLoading(false)
      console.log('AuthStore: Initialization complete')
    } catch (error) {
      console.error('AuthStore: Initialization failed:', error)
      // Always ensure loading is set to false on any error
      this.setLoading(false)
    }
  }

  private async doInitialization() {
    // Load persisted data
    await this.loadPersistedData()
    console.log('AuthStore: Persisted data loaded, user:', !!this.user)

    // Check if user should be logged out due to inactivity
    await this.checkInactivityOnLoad()
    console.log('AuthStore: Inactivity check complete, user:', !!this.user)

    // If user exists, verify with server
    if (this.user) {
      console.log('AuthStore: User exists, calling checkAuth()')
      await this.checkAuth()
    } else {
      console.log('AuthStore: No user found, setting loading=false')
      this.setLoading(false)
    }
  }

  private async loadPersistedData() {
    try {
      const userData = await this.getItem('user')
      const lastActivity = await this.getItem('lastActivity')
      const legacyData = await this.getItem('legacy')

      if (userData) {
        this.user = userData
        this.isLoggedIn = true
      }

      if (lastActivity) {
        this.lastActivity = lastActivity
      }

      if (legacyData) {
        this.email = legacyData.email
        this.name = legacyData.name || ''
        this.phone = legacyData.phone
        this.isPhoneVerified = legacyData.isPhoneVerified || false
        this.isEmailVerified = legacyData.isEmailVerified || false
        this.lastActiveAt = legacyData.lastActiveAt
      }
    } catch (error) {
      console.error('AuthStore: Failed to load persisted data:', error)
    }
  }

  private async checkInactivityOnLoad() {
    if (this.user && this.lastActivity) {
      const timeSinceLastActivity = Date.now() - this.lastActivity
      const timeoutMs = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000
      if (timeSinceLastActivity >= timeoutMs) {
        console.log('AuthStore: User was inactive too long, logging out on page load...')
        await this.logout()
      }
    }
  }

  async setUser(user: User | null) {
    this.user = user
    this.isLoggedIn = !!user

    if (user) {
      this.email = user.email
      this.name = user.name || ''
      this.isEmailVerified = user.email_verified || false
      this.lastActiveAt = Date.now()

      // Persist user data
      await this.setItem({ key: 'user', data: user })
      await this.setItem({
        key: 'legacy',
        data: {
          email: this.email,
          name: this.name,
          phone: this.phone,
          isPhoneVerified: this.isPhoneVerified,
          isEmailVerified: this.isEmailVerified,
          lastActiveAt: this.lastActiveAt,
        },
      })

      this.updateLastActivity()
    } else {
      this.email = undefined
      this.name = ''
      this.phone = undefined
      this.isPhoneVerified = false
      this.isEmailVerified = false
      this.lastActiveAt = undefined

      // Clear persisted data
      await this.removeItem('user')
      await this.removeItem('legacy')
    }

    this.notify()
  }

  setLoading(loading: boolean) {
    this.loading = loading
    this.notify()
  }

  async updateLastActivity() {
    const now = Date.now()
    this.lastActivity = now
    this.lastActiveAt = now

    // Persist activity timestamp
    await this.setItem({ key: 'lastActivity', data: now })
  }

  async updateUserAfterRegistration(user: User) {
    console.log('AuthStore: Updating user after registration:', user)
    await this.setUser(user)
    await this.updateLastActivity()
  }

  async logout() {
    try {
      await api.post('/auth/logout', undefined, { skipRefresh: true })
    } catch (error) {
      console.error('AuthStore: Logout API error:', error)
    }

    // Clear all data
    await this.setUser(null)
    this.setLoading(false)

    // Clear all stored data
    await this.removeItem('user')
    await this.removeItem('lastActivity')
    await this.removeItem('legacy')

    // Redirect to sign-in
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/sign-in'
    }
  }

  async checkAuthWithTimeout() {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 3000)
      })

      const response = (await Promise.race([api.get<{ user: User }>('/auth/me'), timeoutPromise])) as { user: User }

      const { user } = response
      if (user) {
        await this.setUser(user)
      } else {
        // No user from server, clear auth state
        this.user = null
        this.isLoggedIn = false
      }
    } catch (error) {
      // Auth failed or timed out - clear auth state
      this.user = null
      this.isLoggedIn = false
    } finally {
      // Always set loading to false after auth check
      this.loading = false
      this.notify()
    }
  }

  async checkAuth() {
    this.setLoading(true)

    try {
      // Add timeout to prevent hanging (8 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Auth check timeout'))
        }, 8000)
      })

      const response = await Promise.race([api.get<{ user: User }>('/auth/me'), timeoutPromise])

      const { user } = response

      if (user) {
        await this.setUser(user)
      } else {
        await this.setUser(null)
      }
    } catch (error) {
      console.error('AuthStore: Auth check failed:', error)
      await this.setUser(null)
    } finally {
      this.setLoading(false)
    }
  }

  // Method to be called when user becomes idle (from useIdle hook)
  async handleUserIdle() {
    if (!this.user) return

    console.log('AuthStore: User has been idle, logging out...')
    await this.logout()
  }
}

// Create singleton instance
let _authStore: AuthStoreClass | null = null

function getAuthStore(): AuthStoreClass {
  if (!_authStore) {
    _authStore = new AuthStoreClass()
  }
  return _authStore
}

export const AuthStore = getAuthStore()

// React hook for using AuthStore in components with idle detection
export function useAuthStore() {
  const authStore = getAuthStore()

  // Use React state to track store values for reactivity
  const [loading, setLoading] = useState(authStore.loading)
  const [user, setUser] = useState(authStore.user)

  const idle = useIdle(INACTIVITY_TIMEOUT_MINUTES * 60 * 1000, {
    events: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
    initialState: false,
  })

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
      setLoading(authStore.loading)
      setUser(authStore.user)
    })

    // Initial sync
    setLoading(authStore.loading)
    setUser(authStore.user)

    return unsubscribe
  }, [authStore])

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

  // Return only the public API, ensuring methods are properly bound
  return {
    loading,
    user,
    setUser: authStore.setUser.bind(authStore),
    setLoading: authStore.setLoading.bind(authStore),
    checkAuth: authStore.checkAuth.bind(authStore),
    logout: authStore.logout.bind(authStore),
    updateLastActivity: authStore.updateLastActivity.bind(authStore),
    updateUserAfterRegistration: authStore.updateUserAfterRegistration.bind(authStore),
    handleUserIdle: authStore.handleUserIdle.bind(authStore),
    subscribe: authStore.subscribe.bind(authStore),
  }
}
