/**
 * Next.js Middleware — نقطة الدخول الوحيدة لحماية الطلبات
 *
 * Re-exports the proxy function as Next.js middleware.
 * Next.js requires a file named `middleware.ts` exporting a function
 * named `middleware` — this file bridges that requirement.
 *
 * All security logic lives in @/proxy:
 *   - JWT verification & x-user-* header injection
 *   - CSRF token validation (Double Submit Cookie)
 *   - Per-request CSP nonces
 *   - Rate limiting (tiered: auth / api / ai / export)
 *   - Security headers (HSTS, X-Frame-Options, etc.)
 *   - CORS handling
 */

export { proxy as middleware, config } from './proxy';
