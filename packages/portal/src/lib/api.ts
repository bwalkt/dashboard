export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: any;
  baseUrl?: string;
  skipRefresh?: boolean; // Skip automatic token refresh for this request
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public statusText: string, public response?: Response) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Get the backend URL from environment variables
 */
function getBackendUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }
  return url;
}

/**
 * Default headers for API requests
 * Note: Content-Type is not included by default - it's added only when there's a body
 */
const defaultHeaders: HeadersInit = {};

/**
 * Default request options
 */
const defaultOptions: RequestInit = {
  credentials: "include",
  headers: defaultHeaders,
};

/**
 * Track if we're currently refreshing to avoid multiple simultaneous refresh attempts
 */
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Extract error message from a response, falling back to status text
 */
async function extractErrorMessage(response: Response): Promise<string> {
  let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || errorMessage;
  } catch {
    // If we can't parse the error response, use the default message
  }
  return errorMessage;
}

/**
 * Convert HeadersInit to a plain object
 */
function headersToObject(headers: HeadersInit): Record<string, string> {
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return (headers as Record<string, string>) || {};
}

/**
 * Serialize request body based on its type
 */
function serializeBody(body: any, headers: Record<string, string>): { body: any; headers: Record<string, string> } {
  if (body === undefined) {
    const updatedHeaders = { ...headers };
    delete updatedHeaders["Content-Type"];
    return { body: undefined, headers: updatedHeaders };
  }

  const updatedHeaders = { ...headers };

  if (body instanceof FormData) {
    // Don't set Content-Type for FormData, let the browser set it with boundary
    delete updatedHeaders["Content-Type"];
    return { body, headers: updatedHeaders };
  }

  if (typeof body === "object") {
    // Add Content-Type header for JSON body
    updatedHeaders["Content-Type"] = "application/json";
    // JSON.stringify for direct requests
    return { body: JSON.stringify(body), headers: updatedHeaders };
  }

  return { body, headers: updatedHeaders };
}

/**
 * Parse an API response
 */
async function parseResponse<T>(response: Response): Promise<T | undefined> {
  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined;
  }

  // Parse JSON response
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }

  // Return text response for non-JSON content
  return (await response.text()) as T;
}

/**
 * Attempt to refresh the authentication token
 */
async function refreshToken(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: new Headers(defaultHeaders),
      });

      if (!response.ok) {
        throw new ApiError("Token refresh failed", response.status, response.statusText, response);
      }
    } catch (error) {
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
  const { baseUrl = getBackendUrl(), body, headers = {}, skipRefresh = false, ...fetchOptions } = options;
  // Construct the full URL
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Prepare headers as a plain object for serialization
  const headersObj = headersToObject(headers);

  // Handle body serialization
  const { body: serializedBody, headers: updatedHeaders } = serializeBody(body, headersObj);

  // Prepare the request configuration
  const requestConfig: RequestInit = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...updatedHeaders,
    },
    body: serializedBody,
  };

  try {
    const response = await fetch(url, requestConfig);

    // Handle non-OK responses
    if (!response.ok) {
      // Handle 401 Unauthorized with token refresh
      if (response.status === 401 && !skipRefresh && !url.includes("/auth/refresh")) {
        try {
          await refreshToken();
          // Retry the original request after successful refresh
          const retryResponse = await fetch(url, requestConfig);

          if (!retryResponse.ok) {
            const errorMessage = await extractErrorMessage(retryResponse);
            throw new ApiError(errorMessage, retryResponse.status, retryResponse.statusText, retryResponse);
          }

          return await parseResponse<T>(retryResponse);
        } catch (refreshError) {
          // If refresh fails, throw the original 401 error
          const errorMessage = await extractErrorMessage(response);
          throw new ApiError(errorMessage, response.status, response.statusText, response);
        }
      }

      // Handle other non-OK responses
      const errorMessage = await extractErrorMessage(response);
      throw new ApiError(errorMessage, response.status, response.statusText, response);
    }

    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors and other fetch failures
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0, "Network Error");
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, "method" | "body">) => apiRequest<T>(endpoint, { ...options, method: "GET" }),
  post: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, "method">) => apiRequest<T>(endpoint, { ...options, method: "POST", body }),
  put: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, "method">) => apiRequest<T>(endpoint, { ...options, method: "PUT", body }),
  patch: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, "method">) => apiRequest<T>(endpoint, { ...options, method: "PATCH", body }),
  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, "method" | "body">) => apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
