/**
 * CSRF Protection - Client-side Utilities (Double Submit Cookie Pattern)
 *
 * These functions are safe to import from 'use client' components.
 * The server-side CSRF utilities are in @/lib/csrf (which uses Node.js crypto).
 *
 * How it works:
 * 1. The proxy sets a csrf_token cookie (httpOnly: false) on auth
 * 2. Client reads this cookie and sends it as X-CSRF-Token header on mutations
 * 3. The proxy compares the header with the cookie value
 */

/**
 * Get CSRF token from the csrf_token cookie set by the proxy.
 * The proxy uses Double Submit Cookie pattern for CSRF protection.
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Get headers for mutation requests (POST, PUT, PATCH, DELETE).
 * Includes Content-Type and CSRF token.
 */
export function getMutationHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
  };
}
