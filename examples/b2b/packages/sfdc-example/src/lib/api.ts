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
import { CHALLENGE_PARAMS_HEADER, challengeManager } from '@pzero/shared/challenge'
import {
  ApiError,
  ApiRequestOptions,
  ApiResponse,
  CHALLENGE_ANSWER_HEADER,
  CHALLENGE_HEADER,
  CHALLENGE_ID_HEADER,
  extractErrorMessage,
  headersToObject,
  PROXY_TARGET_HEADER,
  serializeBody,
  VALIDATION_HEADER,
} from '@pzero/shared/http'
import { getUseWasm } from './proxy-config'

/**
 * Get the challenge secret from environment variables
 * This should match the CHALLENGE_SECRET on the server
 * @throws Error if VITE_CHALLENGE_SECRET is not set in non-development environments
 */

/**
 * Extract and solve challenge from response headers
 * Stores the solution in localStorage for future requests
 */
async function handleChallengeHeaders(response: Response): Promise<void> {
  const challengeId = response.headers.get(CHALLENGE_ID_HEADER)
  const challenge = response.headers.get(CHALLENGE_HEADER)
  const params = response.headers.get(CHALLENGE_PARAMS_HEADER)
  console.log('handleChallengeHeaders', { challengeId, challenge, params })
  if (challengeId && challenge) {
    try {
      // Parse params or use default values
      let parsedParams = { x: '0', y: '0' }
      if (params) {
        try {
          parsedParams = JSON.parse(params)
        } catch (error) {
          console.warn('Failed to parse challenge params, using defaults:', error)
        }
      }

      // Solve the challenge
      // Store in localStorage
      const answer = challengeManager.storeChallenge({ id: challengeId, question: challenge, params: parsedParams })
      console.log('Challenge solved and stored:', { challengeId, challenge, answer })
    } catch (error) {
      console.error('Failed to solve challenge:', error)
    }
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
        [PROXY_TARGET_HEADER]: import.meta.env.VITE_PROXY_TARGET,
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
 * Parse an API response
 */
async function parseResponse<T>(response: Response): Promise<T> {
  storeValidationHeader(response)
  // Handle challenge headers from response
  await handleChallengeHeaders(response)

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }
  const contentType = response.headers.get('content-type')
  const data = (await (contentType && contentType.includes('application/json')
    ? response.json()
    : response.text())) as T
  challengeManager.handleResponse(response)
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
      await handleChallengeHeaders(response)
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

  // Attach challenge headers if available
  if (getUseWasm()) {
    const challengeId = headersObj ? headersObj[CHALLENGE_ID_HEADER] : undefined
    const storedChallenge = challengeManager.getChallenge(challengeId)
    if (storedChallenge && storedChallenge.answer !== undefined) {
      updatedHeaders[CHALLENGE_ID_HEADER] = storedChallenge.id
      updatedHeaders[CHALLENGE_ANSWER_HEADER] = storedChallenge.answer as string
      console.log('Attaching stored challenge headers:', {
        [CHALLENGE_ID_HEADER]: storedChallenge.id,
        [CHALLENGE_ANSWER_HEADER]: storedChallenge.answer,
      })
    }
  } else {
    // Hardcoded challenge for testing WASM proxy mode
    updatedHeaders[CHALLENGE_ID_HEADER] = '1'
    updatedHeaders[CHALLENGE_ANSWER_HEADER] = '1'
    console.log('Attaching hardcoded challenge headers for WASM proxy mode:', {
      [CHALLENGE_ID_HEADER]: '1',
      [CHALLENGE_ANSWER_HEADER]: '1',
    })
  }

  // Prepare the request configuration
  const requestConfig: RequestInit = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...getDefaultHeaders(),
      ...updatedHeaders,
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
