/** biome-ignore-all lint/correctness/noUndeclaredVariables: K6 env variables */
/**
 * Utility functions for k6 performance tests
 * Handles authentication, proxy headers, and challenge management
 * Uses ChallengeManager pattern similar to sfdc-example api.ts
 */

import type { Response } from 'k6/http'
import http from 'k6/http'

// Challenge header constants (matching @pzero/shared/challenge)
const CHALLENGE_ID_HEADER = 'x-challenge-id'
const CHALLENGE_ANSWER_HEADER = 'x-challenge-answer'
const PROXY_TARGET_HEADER = 'x-proxy-target'
const VALIDATION_HEADER = 'x-test-eval'

// Static challenge answer for perf tests (no grid-based solving)
const STATIC_CHALLENGE_ANSWER = __ENV.STATIC_CHALLENGE_ANSWER ?? 'static-secret'
const STATIC_CHALLENGE_ID = __ENV.STATIC_CHALLENGE_ID ?? ''

interface StoredChallenge {
  id: string
}

interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  readonly length: number
  key(index: number): string | null
}

/**
 * MemoryStorage implementation for k6 (no localStorage available)
 * Similar to MemoryStorage in @pzero/shared/challenge
 */
class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map()

  entries(): IterableIterator<[string, string]> {
    return this.store.entries()
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] || null
  }
}

/**
 * ChallengeManager for k6 perf tests: stores challenge IDs and sends STATIC_CHALLENGE_ANSWER.
 * No grid or expression solving.
 */
class ChallengeManager {
  private storage: Storage
  private challengeIds: string[] = []

  constructor(storage: Storage) {
    this.storage = storage
    this.loadChallengesFromStorage()
  }

  private loadChallengesFromStorage(): void {
    try {
      if (this.storage instanceof MemoryStorage) {
        for (const [key, value] of this.storage.entries()) {
          if (key.startsWith('challenge:')) {
            try {
              const parsed = JSON.parse(value) as { id?: string }
              const id = typeof parsed?.id === 'string' ? parsed.id : key.replace('challenge:', '')
              if (id && !this.challengeIds.includes(id)) {
                this.challengeIds.push(id)
              }
            } catch {
              const id = key.replace('challenge:', '')
              if (id && !this.challengeIds.includes(id)) {
                this.challengeIds.push(id)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[ChallengeManager] Failed to load challenges from storage:', error)
    }
  }

  /**
   * Extract challenge id from response headers (id only; no solving).
   */
  extractChallengeFromHeaders(headers: { get: (name: string) => string | null }): StoredChallenge | null {
    const challengeId = headers.get(CHALLENGE_ID_HEADER)
    if (!challengeId) {
      return null
    }
    const stored: StoredChallenge = { id: challengeId }
    this.storeChallenge(stored)
    this.storage.setItem('lastUsedChallengeId', challengeId)
    return stored
  }

  /**
   * Store challenge by id only (no solving).
   */
  storeChallenge(challenge: { id: string }): void {
    if (!this.challengeIds.includes(challenge.id)) {
      this.challengeIds.push(challenge.id)
    }
    this.storage.setItem(`challenge:${challenge.id}`, JSON.stringify({ id: challenge.id }))
  }

  getChallenge(_challengeId?: string): StoredChallenge | null {
    const id = this.challengeIds[0] ?? null
    return id ? { id } : null
  }

  clearAllChallenges(): void {
    const keys: string[] = []
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (key?.startsWith('challenge:')) {
        keys.push(key)
      }
    }
    for (const key of keys) {
      this.storage.removeItem(key)
    }
    this.challengeIds.length = 0
  }

  /**
   * Add challenge headers: stored id + STATIC_CHALLENGE_ANSWER, or STATIC_CHALLENGE_ID if set and no stored challenges.
   */
  addChallengeHeaders(headers: Record<string, string>): Record<string, string> {
    const challenge = this.getChallenge()
    const id = challenge?.id ?? (STATIC_CHALLENGE_ID || null)
    if (!id) {
      return headers
    }
    this.clearChallenge(id)
    return {
      ...headers,
      [CHALLENGE_ID_HEADER]: id,
      [CHALLENGE_ANSWER_HEADER]: STATIC_CHALLENGE_ANSWER,
    }
  }

  clearChallenge(challengeId: string): void {
    const idx = this.challengeIds.indexOf(challengeId)
    if (idx >= 0) {
      this.challengeIds.splice(idx, 1)
    }
    this.storage.removeItem(`challenge:${challengeId}`)
  }

  /**
   * Handle challenge response: store challenge id(s) only; no grid.
   */
  handleResponse(
    headers: { get: (name: string) => string | null },
    _userData?: unknown,
    challenges?: Array<{ id: string } | { id: string; question?: string; params?: unknown }>,
  ): void {
    if (challenges && Array.isArray(challenges) && challenges.length > 0) {
      this.clearAllChallenges()
      for (const c of challenges) {
        if (typeof c?.id === 'string') {
          this.storeChallenge({ id: c.id })
        }
      }
      this.storage.setItem('lastUsedChallengeId', challenges[0].id)
    } else {
      this.extractChallengeFromHeaders(headers)
    }
  }

  logoff(): void {
    this.clearAllChallenges()
  }
}

// Create a MemoryStorage instance for k6
const k6Storage = new MemoryStorage()

// Create a ChallengeManager instance with MemoryStorage
const challengeManager = new ChallengeManager(k6Storage)

// Store validation header value
let validationHeaderValue: string | null = null

/**
 * Get proxy target URL from environment or use default
 */
export function getProxyTarget(): string {
  return __ENV.PROXY_TARGET || 'pzero-sfdc-server'
}

/**
 * Get base API URL
 */
export function getBaseUrl(): string {
  return __ENV.BASE_URL || 'https://pzero-envoy.incmix.com/proxy'
}

/**
 * Store validation header from response
 * Similar to storeValidationHeader in api.ts
 */
function storeValidationHeader(response: Response): void {
  const value = response.headers[VALIDATION_HEADER]

  if (!value) {
    return
  }

  const parts = value.split('*')
  if (parts.length !== 2) {
    console.warn(`[Utils] Invalid ${VALIDATION_HEADER} header format:`, value)
    return
  }

  const randomInt1 = Number(parts[0])
  const randomInt2 = Number(parts[1])

  if (Number.isNaN(randomInt1) || Number.isNaN(randomInt2)) {
    console.warn(`[Utils] Invalid ${VALIDATION_HEADER} header values:`, value)
    return
  }

  const res = randomInt1 * randomInt2
  validationHeaderValue = res.toString()
}

/**
 * Convert k6 Response headers to Headers-like object for ChallengeManager
 */
function createHeadersFromK6Response(response: Response): {
  get: (name: string) => string | null
} {
  return {
    get: (name: string) => {
      const lowerName = name.toLowerCase()
      for (const [key, value] of Object.entries(response.headers)) {
        if (key.toLowerCase() === lowerName) {
          return Array.isArray(value) ? value[0] : value
        }
      }
      return null
    },
  }
}

/**
 * Handle challenge response - extract challenges and grid from response
 * Similar to handleChallengeHeaders and parseResponse in api.ts
 * This version accepts a pre-parsed body to avoid calling response.json() multiple times
 */
export function handleChallengeResponseWithBody(response: Response, parsedBody?: any): void {
  // Store validation header if present
  storeValidationHeader(response)

  // Convert k6 response to Headers-like object
  const headers = createHeadersFromK6Response(response)

  // Extract grid and challenges from parsed body
  // biome-ignore lint/suspicious/noExplicitAny: Will be fixed in future
  let userData: any
  // biome-ignore lint/suspicious/noExplicitAny: Will be fixed in future
  let challenges: any[] | undefined

  if (parsedBody) {
    userData = parsedBody?.user?.data
    challenges = parsedBody?.challenges

    // Debug logging
    if (userData?.grid) {
      console.log(`[Utils] Found grid in response: ${userData.grid.length}x${userData.grid[0]?.length || 0}`)
    } else {
      console.warn('[Utils] No grid found in userData')
      if (parsedBody?.user) {
        console.warn('[Utils] User object exists but no grid found')
        console.warn('[Utils] User keys:', Object.keys(parsedBody.user))
        if (parsedBody.user.data) {
          console.warn('[Utils] User.data keys:', Object.keys(parsedBody.user.data))
        } else {
          console.warn('[Utils] User.data is undefined')
        }
      } else {
        console.warn('[Utils] No user object in response')
        console.warn('[Utils] Response keys:', Object.keys(parsedBody))
      }
    }

    if (challenges && challenges.length > 0) {
      console.log(`[Utils] Found ${challenges.length} challenges in response`)
    }
  } else {
    console.warn('[Utils] No parsed body provided')
  }

  // Use ChallengeManager to handle the response
  challengeManager.handleResponse(headers, userData, challenges)
}

/**
 * Handle challenge response - extract challenges and grid from response
 * Similar to handleChallengeHeaders and parseResponse in api.ts
 * This version parses the body (use handleChallengeResponseWithBody if body is already parsed)
 */
export function handleChallengeResponse(response: Response): void {
  // Parse body once
  let parsedBody: any
  try {
    const contentType = response.headers['Content-Type'] || ''
    if (contentType.includes('application/json')) {
      parsedBody = response.json() as any
    }
  } catch (error) {
    console.error('[Utils] Failed to parse response body:', error)
  }

  handleChallengeResponseWithBody(response, parsedBody)
}

/**
 * Create headers with authentication token and optional challenge headers
 * Similar to createHeaders in api.ts but adapted for k6
 */
export function createHeaders(isJson: boolean = false, includeChallenge: boolean = true): Record<string, string> {
  const token = __ENV.AUTH_TOKEN
  if (!token) {
    throw new Error('AUTH_TOKEN environment variable is required')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    [PROXY_TARGET_HEADER]: getProxyTarget(),
  }

  if (isJson) {
    headers['Content-Type'] = 'application/json'
  }

  // Add validation header if available
  if (validationHeaderValue) {
    headers[VALIDATION_HEADER] = validationHeaderValue
  }

  // Add challenge headers if available and requested
  // Use ChallengeManager.addChallengeHeaders similar to api.ts
  if (includeChallenge) {
    const challengeHeaders = challengeManager.addChallengeHeaders(headers)
    Object.assign(headers, challengeHeaders)

    // Store last used challenge ID if we have challenge headers
    if (CHALLENGE_ID_HEADER in challengeHeaders) {
      k6Storage.setItem('lastUsedChallengeId', challengeHeaders[CHALLENGE_ID_HEADER])
    }
  }

  return headers
}

/**
 * Make a GET request with proper headers and challenge handling
 * Similar to api.get in api.ts
 */
export function makeRequest(endpoint: string, params?: Record<string, string | number>): Response {
  const baseUrl = getBaseUrl()
  let url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  // Add query parameters
  if (params) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&')
    url += `?${queryString}`
  }

  const headers = createHeaders(false, true)
  const response = http.get(url, { headers })

  // Handle challenge response (parses body internally)
  handleChallengeResponse(response)

  return response
}

/**
 * Make a POST request with proper headers and challenge handling
 * Similar to api.post in api.ts
 * Returns both the response and parsed body (since response.json() can only be called once in k6)
 */
// biome-ignore lint/suspicious/noExplicitAny: Will be fixed in future
export function makePostRequest(
  endpoint: string,
  body?: any,
  includeChallenge: boolean = true,
): { response: Response; parsedBody?: any } {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const headers = createHeaders(true, includeChallenge)
  const response = http.post(url, JSON.stringify(body || {}), { headers })

  // Parse body once (response.json() can only be called once in k6)
  let parsedBody: any
  try {
    const contentType = response.headers['Content-Type'] || ''
    if (contentType.includes('application/json')) {
      parsedBody = response.json() as any
    }
  } catch (error) {
    console.warn('[Utils] Failed to parse response body:', error)
  }

  // Handle challenge response with parsed body
  handleChallengeResponseWithBody(response, parsedBody)

  return { response, parsedBody }
}

/**
 * Warm up and collect challenge ids from /auth/me.
 * Uses static challenge answer (STATIC_CHALLENGE_ANSWER); no grid required.
 * Returns true if POST /auth/me returns 200.
 */
export function initializeGrid(): boolean {
  try {
    console.log('[Utils] Warming up via /auth/me (static challenge answer mode)...')
    const { response, parsedBody } = makePostRequest('/auth/me', {}, false)
    console.log(`[Utils] /auth/me response status: ${response.status}`)
    if (response.status === 200) {
      console.log('[Utils] Initialization successful')
      return true
    }
    console.error(`[Utils] /auth/me returned status ${response.status}`)
    if (parsedBody) {
      console.error('[Utils] Error response body:', JSON.stringify(parsedBody).substring(0, 500))
    } else {
      const errorBody = response.body || ''
      console.error('[Utils] Error response body (raw):', String(errorBody).substring(0, 500))
    }
    return false
  } catch (error) {
    console.error('[Utils] Failed to initialize:', error)
    if (error instanceof Error) {
      console.error('[Utils] Error message:', error.message)
      console.error('[Utils] Error stack:', error.stack)
    }
    return false
  }
}

/**
 * Clear all stored state (useful for cleanup)
 * Similar to logoff in ChallengeManager
 */
export function clearState(): void {
  challengeManager.logoff()
  validationHeaderValue = null
}
