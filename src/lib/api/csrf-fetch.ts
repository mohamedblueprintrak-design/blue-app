/**
 * CSRF-Aware Global Fetch Wrapper
 * حماية CSRF تلقائية لجميع طلبات API — Automatic CSRF protection for all API requests
 *
 * This module patches the global `fetch` to automatically include
 * the X-CSRF-Token header on all mutation requests (POST, PUT, PATCH, DELETE).
 *
 * Uses the Double Submit Cookie pattern:
 * - Middleware sets csrf_token cookie on page GET requests
 * - This wrapper reads the cookie and includes it as X-CSRF-Token header
 * - Middleware validates cookie value matches header value
 *
 * Must be initialized on the client side only (call initCsrfFetch() once).
 */

import { getCsrfToken } from '@/lib/csrf-client';

const CSRF_HEADER_NAME = 'X-CSRF-Token';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Store the original fetch reference before patching */
let originalFetch: typeof fetch | null = null;
let initialized = false;

/**
 * Initialize the CSRF-aware fetch wrapper.
 * Call this once on the client side (e.g., in a provider or layout).
 * It patches globalThis.fetch to automatically inject CSRF tokens.
 */
export function initCsrfFetch(): void {
  if (typeof window === 'undefined' || initialized) return;

  originalFetch = window.fetch;
  initialized = true;

  window.fetch = function csrfAwareFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    // Only inject CSRF for mutation requests to /api/ endpoints
    const method = (init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

    const isMutation = MUTATION_METHODS.has(method);
    const isApiCall = url.startsWith('/api/') || url.includes('/api/');

    if (isMutation && isApiCall) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        // Merge CSRF header into existing headers
        const headers = new Headers(init?.headers as HeadersInit || {});
        if (!headers.has(CSRF_HEADER_NAME)) {
          headers.set(CSRF_HEADER_NAME, csrfToken);
        }
        init = { ...init, headers };
      }
    }

    return originalFetch!.call(window, input, init);
  };
}

/**
 * Restore the original fetch (for testing or cleanup).
 */
export function restoreOriginalFetch(): void {
  if (originalFetch && typeof window !== 'undefined') {
    window.fetch = originalFetch;
    originalFetch = null;
    initialized = false;
  }
}
