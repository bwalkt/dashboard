import { useIdle } from '@mantine/hooks'
import type { User } from '@pzero/shared'
import { api } from '@pzero/shared/api'
import { useEffect } from 'react'
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

  constructor() {
    super(STORE)
    this.initializeStore()
  }

  private async initializeStore() {
    try {
      console.log('AuthStore: Initializing...')
      // Load persisted data
      await this.loadPersistedData()
      // Check if user should be logged out due to inactivity
      await this.checkInactivityOnLoad()

      // If user exists, verify with server
      if (this.user) {
        await this.checkAuth()
      } else {
        this.setLoading(false)
      }

      console.log('AuthStore: Initialization complete')
    } catch (error) {
      console.error('AuthStore: Initialization failed:', error)
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
  }

  setLoading(loading: boolean) {
    this.loading = loading
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
  async checkAuth() {
    this.setLoading(true)

    try {
      const response = await api.get<{ user: User }>('/auth/me')
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
