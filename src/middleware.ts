// Next.js only recognizes middleware exported from src/middleware.ts (or .js).
// The actual implementation lives in src/proxy.ts to keep the file name
// semantically aligned with its role (JWT auth proxy, CSRF, rate-limit, security headers).
// This file simply re-exports so Next.js picks it up automatically.

export { proxy as middleware, config } from './proxy';
