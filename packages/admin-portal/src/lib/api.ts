/**
 * Reusable API utility for making HTTP requests to the backend
 *
 * Features:
 * - Automatic token refresh on 401 responses
 * - Centralized error handling
 * - Type-safe responses
 * - Consistent configuration
 * - Built-in retry logic for authentication failures
 */

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
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Get the backend URL from environment variables
 */
function getBackendUrl(): string {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (!backendUrl) {
    throw new Error("Backend URL not configured. Please set VITE_BACKEND_URL in your environment variables.");
  }
  return backendUrl;
}

/**
 * Default headers for API requests
 */
const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
};

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
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
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

  // Prepare the request configuration
  const requestConfig: RequestInit = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  // Handle body serialization
  if (body !== undefined) {
    if (body instanceof FormData) {
      // Don't set Content-Type for FormData, let the browser set it with boundary
      delete (requestConfig.headers as Record<string, string>)["Content-Type"];
      requestConfig.body = body;
    } else if (typeof body === "object") {
      requestConfig.body = JSON.stringify(body);
    } else {
      requestConfig.body = body;
    }
  }

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
            let errorMessage = `Request failed: ${retryResponse.status} ${retryResponse.statusText}`;

            try {
              const errorData = await retryResponse.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
              // If we can't parse the error response, use the default message
            }

            throw new ApiError(errorMessage, retryResponse.status, retryResponse.statusText, retryResponse);
          }

          // Use the retry response for the rest of the function
          const contentType = retryResponse.headers.get("content-type");
          if (retryResponse.status === 204 || retryResponse.headers.get("content-length") === "0") {
            return {} as T;
          }

          if (contentType && contentType.includes("application/json")) {
            return await retryResponse.json();
          }

          return (await retryResponse.text()) as T;
        } catch (refreshError) {
          // If refresh fails, throw the original 401 error
          let errorMessage = `Request failed: ${response.status} ${response.statusText}`;

          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // If we can't parse the error response, use the default message
          }

          throw new ApiError(errorMessage, response.status, response.statusText, response);
        }
      }

      // Handle other non-OK responses
      let errorMessage = `Request failed: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new ApiError(errorMessage, response.status, response.statusText, response);
    }

    // Handle empty responses (e.g., 204 No Content)
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return {} as T;
    }

    // Parse JSON response
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    // Return text response for non-JSON content
    return (await response.text()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors and other fetch failures
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0, "Network Error");
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, "method" | "body">) => apiRequest<T>(endpoint, { ...options, method: "GET" }),

  /**
   * POST request
   */
  post: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, "method">) => apiRequest<T>(endpoint, { ...options, method: "POST", body }),

  /**
   * PUT request
   */
  put: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, "method">) => apiRequest<T>(endpoint, { ...options, method: "PUT", body }),

  /**
   * PATCH request
   */
  patch: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, "method">) => apiRequest<T>(endpoint, { ...options, method: "PATCH", body }),

  /**
   * DELETE request
   */
  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, "method" | "body">) => apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
