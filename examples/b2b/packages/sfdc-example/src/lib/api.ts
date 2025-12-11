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

import { getUseProxy } from './proxy-config'

const PROXY_TARGET_ID_HEADER = 'x-proxy-target-id'
const CHALLENGE_ID_HEADER = 'x-challenge-id'
const CHALLENGE_HEADER = 'x-challenge'
const CHALLENGE_ANSWER_HEADER = 'x-challenge-answer'

// LocalStorage keys
const CHALLENGE_ID_STORAGE_KEY = 'challenge_id'
const CHALLENGE_ANSWER_STORAGE_KEY = 'challenge_answer'

/**
 * Store challenge data in localStorage
 */
function storeChallenge(challengeId: string, challengeAnswer: string): void {
  localStorage.setItem(CHALLENGE_ID_STORAGE_KEY, challengeId)
  localStorage.setItem(CHALLENGE_ANSWER_STORAGE_KEY, challengeAnswer)
}

/**
 * Get stored challenge data from localStorage
 */
function getStoredChallenge(): { challengeId: string; challengeAnswer: string } | null {
  const challengeId = localStorage.getItem(CHALLENGE_ID_STORAGE_KEY)
  const challengeAnswer = localStorage.getItem(CHALLENGE_ANSWER_STORAGE_KEY)

  if (challengeId && challengeAnswer) {
    return { challengeId, challengeAnswer }
  }

  return null
}

/**
 * Extract and solve challenge from response headers
 * Stores the solution in localStorage for future requests
 */
async function handleChallengeHeaders(response: Response): Promise<void> {
  const challengeId = response.headers.get(CHALLENGE_ID_HEADER)
  const challenge = response.headers.get(CHALLENGE_HEADER)
  const challengeAnswer = response.headers.get(CHALLENGE_ANSWER_HEADER)

  // Log all challenge-related headers for debugging
  console.log('Challenge headers received:', {
    challengeId,
    challenge,
    challengeAnswer,
    allHeaders: Object.fromEntries(response.headers.entries()),
  })

  // Store if we have challengeId and either challengeAnswer (preferred) or challenge
  if (challengeId) {
    const answerToStore = challengeAnswer || challenge
    if (answerToStore) {
      try {
        storeChallenge(challengeId, answerToStore)
        console.log('Challenge stored in localStorage:', { challengeId, challengeAnswer: answerToStore })
      } catch (error) {
        console.error('Failed to store challenge in localStorage:', error)
      }
    } else {
      console.warn('Challenge ID received but no challenge or challengeAnswer header found')
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
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  if (!backendUrl) {
    throw new Error('Backend URL not configured. Please set VITE_BACKEND_URL in your environment variables.')
  }
  return backendUrl
}
/**
 * Get the proxy URL from environment variables
 */
function getProxyUrl(): string {
  const proxyUrl = import.meta.env.VITE_PROXY_URL
  if (!proxyUrl) {
    throw new Error('Proxy URL not configured. Please set VITE_PROXY_URL in your environment variables.')
  }
  return proxyUrl
}
/**
 * Get the proxy target URL from environment variables
 */
function getProxyTarget(): string {
  const proxyTarget = import.meta.env.VITE_PROXY_TARGET
  if (!proxyTarget) {
    throw new Error('Proxy target not configured. Please set VITE_PROXY_TARGET in your environment variables.')
  }
  return proxyTarget
}

/**
 * Default headers for API requests
 * Note: Content-Type is not included by default - it's added only when there's a body
 */
const defaultHeaders: HeadersInit = {}

/**
 * Default request options
 */
const defaultOptions: RequestInit = {
  credentials: 'include',
  headers: defaultHeaders,
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
function serializeBody(
  body: any,
  headers: Record<string, string>,
  useProxy: boolean,
): { body: any; headers: Record<string, string> } {
  if (body === undefined) {
    return { body: undefined, headers }
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
    if (useProxy) {
      // For proxy requests, return the plain object (will be JSON.stringify'd by createProxyFetchOptions)
      return { body, headers: updatedHeaders }
    } else {
      // For direct requests, JSON.stringify
      return { body: JSON.stringify(body), headers: updatedHeaders }
    }
  }

  return { body, headers: updatedHeaders }
}

/**
 * Parse a direct API response (non-proxy)
 */
async function parseDirectResponse<T>(response: Response): Promise<T> {
  // Handle challenge headers from response
  await handleChallengeHeaders(response)

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T
  }

  // Parse JSON response
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  }

  // Return text response for non-JSON content
  return (await response.text()) as T
}

/**
 * Parse a proxy API response
 */
async function parseProxyResponse<T>(response: Response): Promise<T> {
  // Handle challenge headers from response
  await handleChallengeHeaders(response)

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T
  }

  // The proxy returns the raw body string directly, not wrapped in a data object
  // Check content type to determine how to parse
  const contentType = response.headers.get('content-type')

  if (contentType && contentType.includes('application/json')) {
    // Parse JSON response directly
    const jsonData = await response.json()

    // Check if this is a proxy error response
    if (jsonData && typeof jsonData === 'object' && 'success' in jsonData && jsonData.success === false) {
      // This is a proxy error response, throw it as an error
      throw new ApiError(jsonData.message || 'Proxy request failed', response.status, response.statusText, response)
    }

    return jsonData as T
  }

  // Return text response for non-JSON content
  return (await response.text()) as T
}

/**
 * Return type for proxy fetch options
 */
interface ProxyFetchOptions {
  fetchOptions: RequestInit
}

/**
 * Create fetch options for proxy requests
 * The proxy endpoint now accepts all HTTP methods and forwards them to the target URL
 */
function createProxyFetchOptions(method: string, headers: Record<string, string>, body?: any): ProxyFetchOptions {
  const proxyTarget = getProxyTarget()
  const fetchOptions: RequestInit = {
    method: method,
    headers: new Headers({ ...headers, [PROXY_TARGET_ID_HEADER]: proxyTarget } as HeadersInit),
    credentials: 'include',
  }

  // Add body if present (for POST, PUT, PATCH, DELETE)
  // Note: body may be a plain object (for proxy) or already serialized
  const methodsWithoutBody = ['GET', 'HEAD', 'OPTIONS']
  if (!methodsWithoutBody.includes(method.toUpperCase()) && body !== undefined) {
    // For proxy requests, serialize objects to JSON string
    // FormData and other BodyInit types are passed as-is
    if (body instanceof FormData || body instanceof Blob || typeof body === 'string') {
      fetchOptions.body = body as BodyInit
    } else {
      // JSON stringify objects for proxy requests
      fetchOptions.body = JSON.stringify(body)
      // Ensure Content-Type is set for JSON body
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
    }
  } else {
    // Remove Content-Type header if there's no body
    delete headers['Content-Type']
  }

  return { fetchOptions }
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
      })

      if (!response.ok) {
        throw new ApiError('Token refresh failed', response.status, response.statusText, response)
      }

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

/**
 * Attempt to refresh the authentication token via proxy
 */
async function refreshTokenWithProxy(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const targetUrl = `${getProxyUrl()}/auth/refresh`
      const { fetchOptions } = createProxyFetchOptions('POST', {
        'Content-Type': 'application/json',
      })
      const response = await fetch(targetUrl, fetchOptions)

      if (!response.ok) {
        throw new ApiError('Token refresh failed', response.status, response.statusText, response)
      }

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
export async function apiRequestWithoutProxy<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { baseUrl = getBackendUrl(), body, headers = {}, skipRefresh = false, ...fetchOptions } = options

  // Construct the full URL
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  // Prepare headers as a plain object for serialization
  const headersObj = headersToObject(headers)

  // Handle body serialization
  const { body: serializedBody, headers: updatedHeaders } = serializeBody(body, headersObj, false)

  // Attach challenge headers if available
  const storedChallenge = getStoredChallenge()
  if (storedChallenge) {
    updatedHeaders[CHALLENGE_ID_HEADER] = storedChallenge.challengeId
    updatedHeaders[CHALLENGE_ANSWER_HEADER] = storedChallenge.challengeAnswer
  }

  // Prepare the request configuration
  const requestConfig: RequestInit = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
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

          return await parseDirectResponse<T>(retryResponse)
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

    return await parseDirectResponse<T>(response)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    // Handle network errors and other fetch failures
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0, 'Network Error')
  }
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
export async function apiRequestWithProxy<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  const { baseUrl = getProxyUrl(), body, headers = {}, skipRefresh = false, ...fetchOptions } = options ?? {}

  // Build target URL - handle query parameters in endpoint
  const [endpointPath, endpointQuery] = endpoint.split('?')
  const params = new URLSearchParams(endpointQuery)
  const targetUrl = new URL(`${baseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`)
  params.forEach((value, key) => {
    targetUrl.searchParams.set(key, value)
  })
  // Convert headers to plain object
  const headersObj = headersToObject(headers)

  // Handle body serialization
  const { body: serializedBody, headers: updatedHeaders } = serializeBody(body, headersObj, true)

  // Extract method and preserve all other RequestInit properties (signal, cache, redirect, etc.)
  const { method = 'GET', ...remainingFetchOptions } = fetchOptions

  // Attach challenge headers if available
  const storedChallenge = getStoredChallenge()
  if (storedChallenge) {
    updatedHeaders[CHALLENGE_ID_HEADER] = storedChallenge.challengeId
    updatedHeaders[CHALLENGE_ANSWER_HEADER] = storedChallenge.challengeAnswer
  }

  // Create proxy fetch options
  const { fetchOptions: proxyFetchOptions } = createProxyFetchOptions(method, updatedHeaders, serializedBody)

  // Merge remaining RequestInit properties (signal, cache, redirect, etc.) into proxy fetch options
  const finalFetchOptions: RequestInit = {
    ...proxyFetchOptions,
    ...remainingFetchOptions,
  }
  console.log({ targetUrl, finalFetchOptions })

  try {
    const response = await fetch(targetUrl, finalFetchOptions)

    // Handle non-OK responses
    if (!response.ok) {
      // Handle 401 Unauthorized with token refresh
      if (response.status === 401 && !skipRefresh && !targetUrl.pathname.includes('/auth/refresh')) {
        try {
          await refreshTokenWithProxy()
          // Retry the original request after successful refresh
          const { fetchOptions: retryProxyFetchOptions } = createProxyFetchOptions(
            method,
            updatedHeaders,
            serializedBody,
          )
          // Merge remaining RequestInit properties into retry fetch options
          const retryFinalFetchOptions: RequestInit = {
            ...retryProxyFetchOptions,
            ...remainingFetchOptions,
          }
          const retryResponse = await fetch(targetUrl, retryFinalFetchOptions)

          if (!retryResponse.ok) {
            const errorMessage = await extractErrorMessage(retryResponse)
            throw new ApiError(errorMessage, retryResponse.status, retryResponse.statusText, retryResponse)
          }

          return await parseProxyResponse<T>(retryResponse)
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

    return await parseProxyResponse<T>(response)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    // Handle network errors and other fetch failures
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0, 'Network Error')
  }
}

/**
 * Get the appropriate API request function based on current USE_PROXY setting
 * This checks localStorage dynamically so changes take effect immediately
 */
function getApiRequest() {
  return getUseProxy() ? apiRequestWithProxy : apiRequestWithoutProxy
}

export const api = {
  get: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    getApiRequest()<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>) =>
    getApiRequest()<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>) =>
    getApiRequest()<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>) =>
    getApiRequest()<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    getApiRequest()<T>(endpoint, { ...options, method: 'DELETE' }),
}
