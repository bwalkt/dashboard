/**
 * Reusable API utility for making HTTP requests to the backend
 *
 * Features:
 * - Automatic token refresh on 401 responses
 * - Centralized error handling
 * - Type-safe responses
 * - Consistent configuration
 * - Built-in retry logic for authentication failures
 * - Challenge solving and header attachment
 */

import { challengeManager } from '@pzero/shared/challenge'
import { getUseWasm } from './proxy-config'

const VALIDATION_HEADER = 'X-Test-Eval'
const PROXY_TARGET_ID_HEADER = 'x-proxy-target-id'

/**
 * Extract and solve challenge from response headers
 * Stores the solution in localStorage for future requests
 */
async function handleChallengeHeaders(response: Response, userData?: any): Promise<void> {
  // Extract the grid-based challenge
  const challenge = challengeManager.extractChallengeFromHeaders(response)

  if (challenge) {
    // Store user grid if provided (from /auth/me response)
    if (userData?.grid) {
      challengeManager.storeUserGrid(userData.grid)
    }

    // Try to solve immediately
    const answer = challengeManager.solveChallenge()
    if (answer !== null) {
      console.log('[Challenge] Pre-solved challenge for future requests:', answer)
    }
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any
  baseUrl?: string
  skipRefresh?: boolean // Skip automatic token refresh for this request
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: Response,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Get the backend URL from environment variables
 */
function getBackendUrl(): string {
  if (getUseWasm()) {
    const url = import.meta.env.VITE_PROXY_URL_WASM
    if (!url) {
      throw new Error('VITE_PROXY_URL_WASM is not configured')
    }
    return url
  }
  const url = import.meta.env.VITE_BACKEND_URL
  if (!url) {
    throw new Error('VITE_BACKEND_URL is not configured')
  }
  return url
}

/**
 * Get default headers for API requests (computed dynamically)
 * Note: Content-Type is not included by default - it's added only when there's a body
 */
function getDefaultHeaders(): HeadersInit {
  return getUseWasm()
    ? {
        [PROXY_TARGET_ID_HEADER]: import.meta.env.VITE_PROXY_TARGET,
      }
    : {}
}

/**
 * Default request options
 */
const defaultOptions: RequestInit = {
  credentials: 'include',
}

/**
 * Track if we're currently refreshing to avoid multiple simultaneous refresh attempts
 */
let isRefreshing = false
let refreshPromise: Promise<void> | null = null

/**
 * Extract error message from a response, falling back to status text
 */
async function extractErrorMessage(response: Response): Promise<string> {
  let errorMessage = `Request failed: ${response.status} ${response.statusText}`
  try {
    const errorData = await response.json()
    errorMessage = errorData.message || errorData.error || errorMessage
  } catch {
    // If we can't parse the error response, use the default message
  }
  return errorMessage
}

/**
 * Convert HeadersInit to a plain object
 */
function headersToObject(headers: HeadersInit): Record<string, string> {
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }
  return (headers as Record<string, string>) || {}
}

/**
 * Serialize request body based on its type
 */
function serializeBody(body: any, headers: Record<string, string>): { body: any; headers: Record<string, string> } {
  if (body === undefined) {
    const updatedHeaders = { ...headers }
    delete updatedHeaders['Content-Type']
    return { body: undefined, headers: updatedHeaders }
  }

  const updatedHeaders = { ...headers }

  if (body instanceof FormData) {
    // Don't set Content-Type for FormData, let the browser set it with boundary
    delete updatedHeaders['Content-Type']
    return { body, headers: updatedHeaders }
  }

  if (typeof body === 'object') {
    // Add Content-Type header for JSON body
    updatedHeaders['Content-Type'] = 'application/json'
    // JSON.stringify for direct requests
    return { body: JSON.stringify(body), headers: updatedHeaders }
  }

  return { body, headers: updatedHeaders }
}

/**
 * Parse an API response
 */
async function parseResponse<T>(response: Response): Promise<T | undefined> {
  storeValidationHeader(response)

  // Parse response first to get potential user data with grid
  let data: T | undefined

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    data = undefined
  } else {
    // Parse JSON response
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // Return text response for non-JSON content
      data = (await response.text()) as T
    }
  }

  // Handle challenge headers from response (pass user data for grid extraction)
  await handleChallengeHeaders(response, data)

  return data
}

/**
 * Attempt to refresh the authentication token
 */
async function refreshToken(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: new Headers(getDefaultHeaders()),
      })

      if (!response.ok) {
        throw new ApiError('Token refresh failed', response.status, response.statusText, response)
      }
      storeValidationHeader(response)
      await handleChallengeHeaders(response, undefined)
    } catch (error) {
      throw error
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

const storeValidationHeader = (response: Response) => {
  const value = response.headers.get(VALIDATION_HEADER)

  if (value === null) {
    return
  }

  const parts = value.split('*')
  if (parts.length !== 2) {
    console.warn('Invalid X-Test-Eval header format:', value)
    return
  }

  const randomInt1 = Number(parts[0])
  const randomInt2 = Number(parts[1])

  if (Number.isNaN(randomInt1) || Number.isNaN(randomInt2)) {
    console.warn('Invalid X-Test-Eval header values:', value)
    return
  }

  const res = randomInt1 * randomInt2

  localStorage.setItem(VALIDATION_HEADER, res.toString())
}

/**
 * Make an API request with standardized error handling and configuration
 *
 * Automatically handles:
 * - 401 responses by attempting token refresh and retrying the request
 * - JSON response parsing
 * - Error message extraction
 * - Network error handling
 *
 * @param endpoint - The API endpoint (e.g., "/auth/me")
 * @param options - Request options including body, headers, and skipRefresh flag
 * @returns Promise resolving to the response data
 */
export async function apiRequest<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { baseUrl = getBackendUrl(), body, headers = {}, skipRefresh = false, ...fetchOptions } = options
  console.log('baseUrl', baseUrl)
  console.log('endpoint', endpoint)
  console.log('headers', headers)
  console.log('skipRefresh', skipRefresh)
  console.log('fetchOptions', fetchOptions)
  // Construct the full URL
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  // Prepare headers as a plain object for serialization
  const headersObj = headersToObject(headers)

  // Handle body serialization
  const { body: serializedBody, headers: updatedHeaders } = serializeBody(body, headersObj)

  const storedValidationHeader = localStorage.getItem(VALIDATION_HEADER)
  if (storedValidationHeader) {
    updatedHeaders[VALIDATION_HEADER] = storedValidationHeader
  }

  // Add grid-based challenge headers
  const headersWithChallenge = challengeManager.addChallengeHeaders(updatedHeaders)

  // For WASM proxy mode fallback (if no grid challenge available)
  if (getUseWasm() && !headersWithChallenge['X-Challenge-Answer']) {
    headersWithChallenge['X-Challenge-Id'] = '1'
    headersWithChallenge['X-Challenge-Answer'] = '1'
  }

  // Prepare the request configuration
  const requestConfig: RequestInit = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...getDefaultHeaders(),
      ...headersWithChallenge,
    },
    body: serializedBody,
  }

  try {
    const response = await fetch(url, requestConfig)

    // Handle non-OK responses
    if (!response.ok) {
      // Handle 401 Unauthorized with token refresh
      if (response.status === 401 && !skipRefresh && !url.includes('/auth/refresh')) {
        try {
          await refreshToken()
          // Retry the original request after successful refresh
          const retryResponse = await fetch(url, requestConfig)

          if (!retryResponse.ok) {
            const errorMessage = await extractErrorMessage(retryResponse)
            throw new ApiError(errorMessage, retryResponse.status, retryResponse.statusText, retryResponse)
          }

          return await parseResponse<T>(retryResponse)
        } catch (refreshError) {
          // If refresh fails, throw the original 401 error
          const errorMessage = await extractErrorMessage(response)
          throw new ApiError(errorMessage, response.status, response.statusText, response)
        }
      }

      // Handle other non-OK responses
      const errorMessage = await extractErrorMessage(response)
      throw new ApiError(errorMessage, response.status, response.statusText, response)
    }

    return await parseResponse<T>(response)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    // Handle network errors and other fetch failures
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0, 'Network Error')
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}
