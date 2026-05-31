// @ts-check
/**
 * Unified API Fetch Client
 * Consolidates the best of api-client.ts and use-data.ts request logic
 * into a single, reusable, typed fetch utility.
 */

import { getCsrfToken } from '@/lib/csrf-client';

/** Standard API response wrapper used by all hooks and API helpers. */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: { code: string; message: string };
}

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string = 'ERROR', status: number = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Build default headers for JSON API requests
 * Includes CSRF token for mutation requests (POST, PUT, PATCH, DELETE)
 */
function getDefaultHeaders(token?: string | null, method?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  // Only send Authorization header if token is a real JWT (not the 'httpOnly' marker).
  // When cookies are used, the token is set to 'httpOnly' as a truthy placeholder;
  // the actual JWT lives in an httpOnly cookie sent automatically by the browser.
  if (token && token !== 'httpOnly') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Attach CSRF token for mutation requests (POST, PUT, PATCH, DELETE)
  const isMutation = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (isMutation) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return headers;
}

/**
 * Parse an API response, handling empty bodies and error states
 */
async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      // Handle both error formats:
      //   1. { error: { code, message } } — from errorResponse() / handleApiError()
      //   2. { error: "string" }          — from older routes using NextResponse.json directly
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Response body is not JSON
    }
    throw new Error(errorMessage);
  }

  const text = await response.text();
  if (!text) {
    return { success: true, data: null };
  }
  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      data: null,
      error: {
        code: 'INVALID_JSON',
        message: 'Server returned malformed JSON response',
      },
    };
  }
}

// ============================================
// Core API Request Function
// ============================================

/**
 * Unified API request function using the `/api?action=X` pattern
 * (the pattern used by the existing hooks and expected by the backend).
 *
 * For direct endpoint calls (defects, boq, profile, etc.), use
 * `directApiRequest` instead.
 */
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  action: string,
  data?: Record<string, unknown> | unknown,
  token?: string | null,
): Promise<ApiResponse<T>> {
  const url =
    method === 'GET'
      ? `/api?action=${action}${data ? '&' + new URLSearchParams(data as Record<string, string>).toString() : ''}`
      : `/api?action=${action}`;

  const options: RequestInit = {
    method,
    headers: getDefaultHeaders(token, method),
    credentials: 'include', // Always send httpOnly cookies for auth
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  return parseResponse<T>(response);
}

/**
 * Direct API request function for endpoints that use their own
 * URL path (e.g., /api/defects, /api/boq, /api/profile).
 *
 * @param method - HTTP method
 * @param endpoint - Full endpoint path (e.g., '/api/defects')
 * @param data - Request body (for non-GET) or query params (for GET)
 * @param token - Auth token
 */
export async function directApiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: Record<string, unknown> | unknown,
  token?: string | null,
): Promise<ApiResponse<T>> {
  const isGet = method === 'GET';
  let url = endpoint;

  if (isGet && data) {
    const params = new URLSearchParams();
    const record = data as Record<string, unknown>;
    Object.entries(record).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const options: RequestInit = {
    method,
    headers: getDefaultHeaders(token, method),
    credentials: 'include', // Always send httpOnly cookies for auth
  };

  if (data && !isGet) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  return parseResponse<T>(response);
}

/**
 * Upload a file using FormData (no Content-Type header – browser sets it with boundary).
 */
export async function apiUpload<T>(
  endpoint: string,
  file: File,
  token?: string | null,
): Promise<ApiResponse<T>> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: HeadersInit = {};
  if (token && token !== 'httpOnly') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Attach CSRF token for file upload (POST mutation)
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include', // Always send httpOnly cookies for auth
  });

  return parseResponse<T>(response);
}

// ============================================
// Convenience Helpers (direct endpoint style)
// ============================================

export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  token?: string | null,
): Promise<ApiResponse<T>> {
  let url: string;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        qs.append(key, String(value));
      }
    });
    url = `${endpoint}?${qs.toString()}`;
  } else {
    url = endpoint;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getDefaultHeaders(token, 'GET'),
    credentials: 'include',
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(
  endpoint: string,
  data?: Record<string, unknown>,
  token?: string | null,
): Promise<ApiResponse<T>> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getDefaultHeaders(token, 'POST'),
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  return parseResponse<T>(response);
}

export async function apiPut<T>(
  endpoint: string,
  data: Record<string, unknown>,
  token?: string | null,
): Promise<ApiResponse<T>> {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: getDefaultHeaders(token, 'PUT'),
    body: JSON.stringify(data),
    credentials: 'include',
  });

  return parseResponse<T>(response);
}

export async function apiDelete<T>(
  endpoint: string,
  params?: Record<string, string>,
  token?: string | null,
): Promise<ApiResponse<T>> {
  let url: string;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      qs.append(key, value);
    });
    url = `${endpoint}?${qs.toString()}`;
  } else {
    url = endpoint;
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getDefaultHeaders(token, 'DELETE'),
    credentials: 'include',
  });

  return parseResponse<T>(response);
}

// ============================================
// Response Utility Functions
// ============================================

export function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is ApiResponse<T> & { success: true } {
  return response.success === true;
}

export function isErrorResponse<T>(
  response: ApiResponse<T>,
): response is ApiResponse<T> & { success: false; error: { code: string; message: string } } {
  return response.success === false;
}

/**
 * Extract a human-readable error message from an API error value.
 *
 * The backend has two error formats:
 *   1. `{ error: { code, message } }` — used by errorResponse() / handleApiError()
 *   2. `{ error: "string" }`          — used by some older routes directly
 *
 * This helper normalises both into a string so it is always safe to render
 * in JSX without causing "Objects are not valid as a React child" errors.
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    // Fallback: try to stringify for debugging
    try { return JSON.stringify(obj); } catch { /* ignore */ }
  }
  return fallback;
}

export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (isSuccessResponse(response)) {
    return response.data as T; // data is T | null but callers expect T when success is true
  }
  throw new ApiError(
    response.error?.message || 'Unknown error',
    response.error?.code || 'UNKNOWN',
    400,
  );
}
