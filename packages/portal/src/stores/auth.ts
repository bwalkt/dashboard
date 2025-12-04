import type { User } from '@pzero/shared'
import { api } from '@pzero/shared/api'
import { ZStorage } from './store'

export const STORE = 'auth'

const INACTIVITY_TIMEOUT = parseInt(import.meta.env.VITE_NO_ACTIVITY_MINS || '30') * 60 * 1000 // Convert minutes to ms

export class AuthStoreClass extends ZStorage {
  // Current user data
  user?: User | null = null
  loading: boolean = true
  lastActivity: number = Date.now()
  inactivityTimer?: NodeJS.Timeout | null = null

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

      // Setup activity tracking
      this.setupActivityTracking()

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
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
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
      this.setupInactivityTimer()
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

      this.clearInactivityTimer()
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

    // Reset the inactivity timer
    this.clearInactivityTimer()
    this.setupInactivityTimer()
  }

  async updateUserAfterRegistration(user: User) {
    console.log('AuthStore: Updating user after registration:', user)
    await this.setUser(user)
    await this.updateLastActivity()
  }

  async logout() {
    this.clearInactivityTimer()

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

  private setupInactivityTimer() {
    // Clear existing timer
    this.clearInactivityTimer()

    // Only setup timer if user is authenticated and timeout is configured
    if (this.user && INACTIVITY_TIMEOUT > 0) {
      this.inactivityTimer = setTimeout(() => {
        this.handleInactivity()
      }, INACTIVITY_TIMEOUT)
    }
  }

  private clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
  }

  private async handleInactivity() {
    if (!this.user) return

    const timeSinceLastActivity = Date.now() - this.lastActivity

    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      console.log('AuthStore: User inactive for too long, logging out...')
      await this.logout()
    } else {
      // User was active recently, reset the timer
      this.setupInactivityTimer()
    }
  }

  private setupActivityTracking() {
    if (typeof window === 'undefined') return

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    const handleUserActivity = () => {
      if (this.user) {
        this.updateLastActivity()
      }
    }

    // Setup activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    console.log('AuthStore: Activity tracking initialized')
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

// React hook for using AuthStore in components
export function useAuthStore() {
  return getAuthStore()
}
