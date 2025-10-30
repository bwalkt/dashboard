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
  skipAuth?: boolean; // Skip authentication for this request
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
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (!backendUrl) {
    throw new Error("Backend URL not configured. Please set VITE_BACKEND_URL in your environment variables.");
  }
  return backendUrl;
}
/**
 * Get the proxy URL from environment variables
 */
function getProxyUrl(): string {
  const proxyUrl = import.meta.env.VITE_PROXY_URL;
  if (!proxyUrl) {
    throw new Error("Proxy URL not configured. Please set VITE_PROXY_URL in your environment variables.");
  }
  return proxyUrl;
}
/**
 * Get the backend URL from environment variables
 */
function getProxyTarget(): string {
  const proxyTarget = import.meta.env.VITE_PROXY_TARGET;
  if (!proxyTarget) {
    throw new Error("Proxy target not configured. Please set VITE_PROXY_TARGET in your environment variables.");
  }
  return proxyTarget;
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
        method: "POST",
        credentials: "include",
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
async function refreshTokenWithProxy(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        throw new ApiError("Refresh token not found", 401, "Refresh token not found");
      }
      const response = await fetch(`${getProxyUrl()}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: `${getProxyTarget()}/auth/refresh`,
          method: "POST",
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        }),
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
export async function apiRequestWithoutProxy<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
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

type ApiProxyRequestBody = {
  url: string;
  method: string;
  headers: HeadersInit;
  body?: any;
};
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
export async function apiRequestWithProxy<T = any>(endpoint: string, options: ApiRequestOptions = { skipAuth: false }): Promise<T> {
  const { baseUrl = getProxyTarget(), body, headers = {}, skipRefresh = false, ...fetchOptions } = options;
  const targetUrl = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const proxyUrl = getProxyUrl();

  // Prepare the request configuration
  const requestConfig: ApiProxyRequestBody = {
    url: targetUrl,
    method: fetchOptions.method ?? "GET",
    headers: headers,
    body: body,
  };

  const accessToken = localStorage.getItem("accessToken");
  if (accessToken && !options.skipAuth) {
    requestConfig.headers = {
      ...requestConfig.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

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
    const response = await fetch(proxyUrl, {
      method: "post",
      body: JSON.stringify(requestConfig),
      credentials: "include",
    });

    // Handle non-OK responses
    if (!response.ok) {
      // Handle 401 Unauthorized with token refresh
      if (response.status === 401 && !skipRefresh && !targetUrl.includes("/auth/refresh")) {
        try {
          await refreshTokenWithProxy();
          // Retry the original request after successful refresh
          const retryResponse = await fetch(proxyUrl, {
            method: "post",
            body: JSON.stringify(requestConfig),
            credentials: "include",
          });

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
            const { data } = (await retryResponse.json()) as { data: { statusCode: number; body: string } };
            return JSON.parse(data.body) as T;
          }

          const { data } = (await retryResponse.json()) as { data: { statusCode: number; body: string } };
          return data.body as T;
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
      const { data } = (await response.json()) as { data: { statusCode: number; body: string } };
      console.log(data);
      return JSON.parse(data.body) as T;
    }

    // Return text response for non-JSON content
    const { data } = (await response.json()) as { data: { statusCode: number; body: string } };
    return data.body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors and other fetch failures
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0, "Network Error");
  }
}

const apiRequest = import.meta.env.VITE_USE_PROXY === "true" ? apiRequestWithProxy : apiRequestWithoutProxy;

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
