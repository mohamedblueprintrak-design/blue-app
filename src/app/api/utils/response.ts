import { NextResponse } from 'next/server';
import { ApiSuccessResponse, ApiErrorResponse } from '../types';
import { log } from '@/lib/logger';

/**
 * CORS headers applied to every API response.
 * Previously set in next.config.ts headers(), but moved here because
 * Turbopack on Windows converts any :path* source pattern into an
 * optional [[...slug]] catch-all that conflicts with page routes.
 */
const CORS_HEADERS: Record<string, string> = {
  // NOTE: Access-Control-Allow-Origin is NOT set statically here — it must be
  // resolved dynamically per-request based on the Origin header. The proxy
  // (src/proxy.ts) handles this correctly; for non-proxied deployments the
  // withCorsHeaders function below resolves it from the request.
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-CSRF-Token, Cache-Control',
  'Access-Control-Allow-Credentials': 'true',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // NOTE: Content-Security-Policy is handled centrally by the proxy (src/proxy.ts)
  // NOTE: X-XSS-Protection removed — deprecated; modern browsers rely on CSP
};

/**
 * Apply CORS headers to a NextResponse.
 * If a Request is provided, the Access-Control-Allow-Origin header is set
 * dynamically by matching the request's Origin against CORS_ORIGINS.
 */
function withCorsHeaders(response: NextResponse, request?: Request): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  // Dynamically resolve the allowed origin from the request
  if (request) {
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL);
    } else {
      // SECURITY: Removed the CORS reflector that echoed back any origin.
      // If the origin doesn't match CORS_ORIGINS or NEXT_PUBLIC_APP_URL, we do NOT
      // set Access-Control-Allow-Origin, forcing the browser to block cross-origin requests.
      if (process.env.NODE_ENV === 'development') {
        const devOrigin = process.env.CORS_DEV_ORIGIN || 'http://localhost:3000';
        response.headers.set('Access-Control-Allow-Origin', devOrigin);
      }
    }
  } else {
    // Fallback for non-proxied deployments without a request reference
    const firstOrigin = process.env.CORS_ORIGINS?.split(',')[0]?.trim();
    if (firstOrigin) {
      response.headers.set('Access-Control-Allow-Origin', firstOrigin);
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL);
    } else {
      // SECURITY: No more hardcoded localhost:3000 fallback.
      // Only use the CORS_DEV_ORIGIN env var if explicitly set.
      const devOrigin = process.env.CORS_DEV_ORIGIN || null;
      if (process.env.NODE_ENV === 'development' && devOrigin) {
        response.headers.set('Access-Control-Allow-Origin', devOrigin);
      }
      // If nothing matches, leave ACAO unset (browser will block cross-origin)
    }
  }
  return response;
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Call this at the top of API route handlers:
 *
 *   export async function OPTIONS(request: NextRequest) {
 *     return handleCorsPreflight();
 *   }
 */
export function handleCorsPreflight(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCorsHeaders(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns an ISO-8601 UTC timestamp string. */
function getTimestamp(): string {
  return new Date().toISOString();
}

/** Generates a short random request ID for tracing. */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enum Normalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known Prisma enum field names that should be normalized to lowercase
 * for frontend compatibility.
 */
const ENUM_FIELDS = new Set([
  'status', 'priority', 'severity', 'type', 'clientType',
  'leaveType', 'frequency', 'paymentMethod', 'currency',
  // NOTE: 'role' is intentionally excluded — roles must remain UPPERCASE
  // to match Prisma enum values (ADMIN, MANAGER, etc.) and the
  // ROLE_PERMISSIONS map keys in auth/types.ts.
]);

/**
 * Recursively normalize UPPERCASE Prisma enum values to lowercase.
 * This bridges the gap between Prisma's UPPERCASE enums and the
 * frontend's lowercase type definitions.
 *
 * Only converts string values in known enum fields that are all UPPERCASE.
 */
function normalizeEnums<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(normalizeEnums) as T;
  }
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (
        ENUM_FIELDS.has(key) &&
        typeof value === 'string' &&
        value === value.toUpperCase() &&
        value.length > 1
      ) {
        // Convert UPPERCASE enum value to lowercase
        result[key] = value.toLowerCase();
      } else {
        result[key] = normalizeEnums(value);
      }
    }
    return result as T;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Success Responses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a success response (with CORS headers)
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>, requestId?: string): NextResponse<ApiSuccessResponse<T>> {
  // Normalize Prisma UPPERCASE enum values to lowercase for frontend compatibility
  const normalizedData = normalizeEnums(data);
  const response: ApiSuccessResponse<T> = {
    success: true,
    data: normalizedData,
    timestamp: getTimestamp(),
    ...(meta && { meta }),
    ...(requestId && { requestId }),
  };
  return withCorsHeaders(NextResponse.json(response)) as NextResponse<ApiSuccessResponse<T>>;
}

/**
 * Create a 201 Created response for newly created resources.
 *
 * @param data - The newly created resource data.
 * @param requestId - Optional request identifier for tracing.
 * @returns A NextResponse with status 201.
 */
export function createdResponse<T>(data: T, requestId?: string): NextResponse<ApiSuccessResponse<T>> {
  const normalizedData = normalizeEnums(data);
  const response: ApiSuccessResponse<T> = {
    success: true,
    data: normalizedData,
    timestamp: getTimestamp(),
    ...(requestId && { requestId }),
  };
  return withCorsHeaders(NextResponse.json(response, { status: 201 })) as NextResponse<ApiSuccessResponse<T>>;
}

/**
 * Create a 204 No Content response (no body).
 * Used for successful DELETE operations or updates that return no payload.
 */
export function noContentResponse(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCorsHeaders(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Responses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an error response (with CORS headers)
 */
export function errorResponse(message: string, code = 'ERROR', status = 400, requestId?: string): NextResponse<ApiErrorResponse> {
  return withCorsHeaders(NextResponse.json(
    {
      success: false,
      error: { code, message },
      timestamp: getTimestamp(),
      ...(requestId && { requestId }),
    },
    { status }
  )) as NextResponse<ApiErrorResponse>;
}

/**
 * Create an unauthorized error response
 * Default message is bilingual (Arabic / English) since the API cannot know
 * the client's locale. Callers should pass a locale-appropriate message
 * when the request context is available.
 */
export function unauthorizedResponse(message = 'يرجى تسجيل الدخول / Please log in', requestId?: string): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 'UNAUTHORIZED', 401, requestId);
}

/**
 * Create a forbidden error response
 * Default message is bilingual (Arabic / English) since the API cannot know
 * the client's locale. Callers should pass a locale-appropriate message
 * when the request context is available.
 */
export function forbiddenResponse(message = 'غير مصرح لك بالوصول / Access denied', requestId?: string): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 'FORBIDDEN', 403, requestId);
}

/**
 * Create a not found error response
 * Default message is bilingual (Arabic / English) since the API cannot know
 * the client's locale. Callers should pass a locale-appropriate message
 * when the request context is available.
 */
export function notFoundResponse(message = 'غير موجود / Not found', requestId?: string): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 'NOT_FOUND', 404, requestId);
}

/**
 * Create a server error response
 * Default message is bilingual (Arabic / English) since the API cannot know
 * the client's locale. Callers should pass a locale-appropriate message
 * when the request context is available.
 */
export function serverErrorResponse(message = 'خطأ في الخادم / Server error', requestId?: string): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 'SERVER_ERROR', 500, requestId);
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(message: string, field?: string, requestId?: string): NextResponse<ApiErrorResponse> {
  return withCorsHeaders(NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        ...(field && { field }),
      },
      timestamp: getTimestamp(),
      ...(requestId && { requestId }),
    },
    { status: 400 }
  )) as NextResponse<ApiErrorResponse>;
}

/**
 * Create a conflict error response (duplicate resource)
 */
export function conflictResponse(message: string, requestId?: string): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 'CONFLICT', 409, requestId);
}

/**
 * Create a bad request error response
 */
export function badRequestResponse(message: string, requestId?: string): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 'BAD_REQUEST', 400, requestId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Logging & Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log API error for debugging using Winston logger.
 * Replaces raw console.error calls with structured logging.
 */
export function logApiError(context: string, error: unknown): void {
  log.error(`[API Error] ${context}`, { error: error instanceof Error ? { message: error.message, stack: error.stack } : { error } });
}

/**
 * Handle API errors consistently: log via Winston and return a standardized JSON error response.
 * Use this in catch blocks of API route handlers:
 *
 *   catch (error) {
 *     return handleApiError('Error doing X', error);
 *   }
 */
export function handleApiError(message: string, error: unknown, code = 'SERVER_ERROR', status = 500, requestId?: string): NextResponse<ApiErrorResponse> {
  log.error(message, { error: error instanceof Error ? { message: error.message, stack: error.stack } : { error } });
  return errorResponse(message, code, status, requestId);
}
