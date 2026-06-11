// Next.js only recognizes middleware exported from src/middleware.ts (or .js).
// The actual implementation lives in src/auth-proxy.ts to keep the file name
// semantically aligned with its role (JWT auth proxy, CSRF, rate-limit, security headers).
// This file simply re-exports so Next.js picks it up automatically.

export { proxy as middleware } from './auth-proxy';
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|api/health|api/cron).*)'],
};
