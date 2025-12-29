/**
 * API Utility Helper
 * Provides functions for making authenticated API requests
 */

// In production, use relative URLs (same origin). In development, use localhost:3001
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = (): string | null => localStorage.getItem('authToken');

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: any;
}

/**
 * Make an authenticated API request
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<ApiResponse<T>> => {
  const authToken = token || getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const url = `${API_URL}${endpoint}`;
    console.log(`[API] Making request to: ${url}`, { method: options.method || 'GET', hasToken: !!authToken });
    
    const response = await fetch(url, {
      ...options,
      headers: headers as HeadersInit,
    });

    console.log(`[API] Response status: ${response.status} ${response.statusText} for ${endpoint}`);
    
    const data = await response.json();

    if (!response.ok) {
      console.error(`[API] Request failed for ${endpoint}:`, data);
      return {
        success: false,
        error: data.error || data.message || `API request failed: ${response.statusText}`,
      };
    }

    console.log(`[API] Request successful for ${endpoint}`, { hasData: !!data });
    return {
      success: true,
      data: data.data || data,
      message: data.message,
      meta: data.meta,
    };
  } catch (error: any) {
    console.error(`[API] Network error for ${endpoint}:`, error);
    return {
      success: false,
      error: error.message || 'Network error or API is unreachable',
    };
  }
};

/**
 * GET request helper
 */
export const apiGet = async <T = any>(
  endpoint: string,
  params?: Record<string, any>,
  token?: string | null
): Promise<ApiResponse<T>> => {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    url += `?${searchParams.toString()}`;
  }
  return apiRequest<T>(url, { method: 'GET' }, token);
};

/**
 * POST request helper
 */
export const apiPost = async <T = any>(
  endpoint: string,
  body?: any,
  token?: string | null
): Promise<ApiResponse<T>> =>
  apiRequest<T>(
    endpoint,
    {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    },
    token
  );

/**
 * PUT request helper
 */
export const apiPut = async <T = any>(
  endpoint: string,
  body?: any,
  token?: string | null
): Promise<ApiResponse<T>> =>
  apiRequest<T>(
    endpoint,
    {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    },
    token
  );

/**
 * DELETE request helper
 */
export const apiDelete = async <T = any>(
  endpoint: string,
  token?: string | null
): Promise<ApiResponse<T>> => apiRequest<T>(endpoint, { method: 'DELETE' }, token);

/**
 * PATCH request helper
 */
export const apiPatch = async <T = any>(
  endpoint: string,
  body?: any,
  token?: string | null
): Promise<ApiResponse<T>> =>
  apiRequest<T>(
    endpoint,
    {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    },
    token
  );

