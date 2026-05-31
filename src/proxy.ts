/**
 * Next.js Proxy (previously middleware) — Security Headers + JWT Auth Proxy + Rate Limiting
 *
 * This proxy:
 * 1. Rate-limits ALL API routes using tiered in-memory rate limiting (Edge Runtime compatible)
 * 2. Adds security headers to ALL responses
 * 3. Verifies JWT tokens for protected routes and sets x-user-* headers
 * 4. Validates CSRF tokens for mutating requests
 *
 * Rate Limiting Strategy (3 Layers):
 *
 * Layer 0 (Caddy): Infrastructure-level, AI routes only (10r/m), requires caddy-rate-limit plugin
 * Layer 1 (proxy.ts): Edge Runtime, in-memory fixed-window, all API routes, first line of defense
 * Layer 2 (rate-limiter.ts): Redis-backed sliding window, per-route opt-in, second line of defense
 *
 * Limits are aligned across layers:
 * - auth: 10 req/min (both layers)
 * - api: 100 req/min (both layers)
 * - ai: 10 req/min (all 3 layers)
 * - export: 10 req/min (layers 1 & 2)
 * - strict: 5 req/min (layer 2 only)
 * - passwordReset: 3 req/hour (layer 2 only)
 * - public: 200 req/min (layer 2 only)
 * - publicForm: 10 req/min (layer 2 only)
 * - emailVerification: 5 req/hour (layer 2 only)
 *
 * In Next.js 16+, this file must be named proxy.ts (middleware.ts is deprecated)
 */

import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// ============================================
// Configuration
// ============================================

const COOKIE_NAME = 'blue_token';

/**
 * JWT Secret for proxy (Edge Runtime compatible).
 * MUST match the logic in @/lib/auth/jwt-secret.ts to prevent split-brain.
 *
 * - In production: rejects placeholder/weak secrets (throws → blocks all requests)
 * - In development: uses the same stable fallback as jwt-secret.ts
 * - Uses only process.env + TextEncoder (both available in Edge Runtime)
 */
const JWT_SECRET = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && (!secret || secret.length < 32 ||
      secret.includes('change-me') || secret.includes('change_this') ||
      secret.includes('your_') ||
      secret === 'blueprint-dev-secret-do-not-use-in-production-min32chars!')) {
    // Production without valid JWT_SECRET — reject ALL tokens
    // This forces admins to set JWT_SECRET properly
    throw new Error('JWT_SECRET is required in production');
  }

  if (!secret || secret.length < 32) {
    return new TextEncoder().encode('blueprint-dev-secret-do-not-use-in-production-min32chars!');
  }

  return new TextEncoder().encode(secret);
};

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/login', '/api/auth/register', '/api/auth/logout',
  '/api/auth/session', '/api/auth/forgot-password', '/api/auth/reset-password',
  '/api/auth/verify-email', '/api/auth/resend-verification',
  '/api/auth/2fa', '/api/auth/2fa/verify', '/api/auth/2fa/backup-codes',
  '/api/auth/ws-token', '/api/auth/refresh',
  '/api/quote-requests', '/api/health',
  '/api/stripe/webhook', '/api/public',
  '/api/stripe/plans', // Public pricing plans for landing page
  '/api/portal',       // Public client portal — lookup by phone + project number
  '/api/cron/cleanup',
  '/api/public/stats',
];

// CSRF exempt paths — use exact paths, not prefixes
// This prevents /api/auth from exempting /api/auth/change-password, etc.
const CSRF_EXEMPT_PATHS = [
  '/api/stripe/webhook',
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/2fa',
  '/api/auth/2fa/verify',
  '/api/auth/2fa/backup-codes',
  '/api/auth/refresh',
  '/api/auth/ws-token',
  '/api/seed',
  '/api/quote-requests',
  '/api/cron/cleanup',
  '/api/public/stats',
];

// Public page routes (no auth needed)
// NOTE: /dashboard handles its own auth (shows login form when not authenticated)
// so it must be public — otherwise the proxy redirects to /login which doesn't exist
const PUBLIC_PAGE_ROUTES = [
  '/', '/services', '/calculator', '/quote', '/portal', '/about',
  '/forgot-password', '/reset-password', '/verify-email', '/2fa-setup',
  '/login', '/register', '/dashboard',
];

// ============================================
// Security Headers
// ============================================

const BASE_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Build the Content-Security-Policy header value.
 *
 * Uses a per-request nonce in script-src so that only scripts with a matching
 * nonce attribute are executed. This replaces the previous 'unsafe-inline'
 * directive, which completely negated CSP protection against XSS.
 *
 * The nonce is generated per-request in the proxy() function and passed to
 * the frontend via the `x-nonce` response header. Next.js <Script nonce={...}>
 * applies it to inline scripts.
 *
 * Development: also allows 'unsafe-eval' (webpack HMR) and ws:/wss: (HMR socket).
 * Production: stricter — no 'unsafe-eval', no ws:.
 *
 * style-src retains 'unsafe-inline' because Tailwind CSS generates inline
 * styles. Removing it would require modifying the Tailwind build pipeline,
 * which is out of scope. Style injection is less dangerous than script injection.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';

  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}'`;

  const connectSrc = isDev
    ? "connect-src 'self' https: ws: wss:"
    : "connect-src 'self' https:";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    connectSrc,
    "media-src 'self' https: blob:",
    "frame-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; ');
}

function addSecurityHeaders(
  response: NextResponse,
  nonce: string,
  rateLimitInfo?: { tier: RateLimitTier; remaining: number; resetTime: number; limit: number }
): NextResponse {
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  // CSP is built dynamically with a per-request nonce so it adapts to dev vs. prod
  response.headers.set('Content-Security-Policy', buildCsp(nonce));

  // Expose the nonce to the frontend so Next.js <Script nonce={...}> can use it
  response.headers.set('x-nonce', nonce);

  // Add rate-limit info headers to successful responses so clients can see quota
  if (rateLimitInfo) {
    response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());
    response.headers.set('X-RateLimit-Tier', rateLimitInfo.tier);
  }

  // HSTS — only in production (requires HTTPS; must not be set over HTTP)
  // max-age=63072000 ≈ 2 years, includeSubDomains, preload for HSTS preload list
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Timing-safe string comparison using Web Crypto API (Edge Runtime compatible).
 * Prevents timing side-channel attacks on CSRF token comparison.
 */
async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const aKey = await crypto.subtle.importKey('raw', encoder.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bKey = await crypto.subtle.importKey('raw', encoder.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const aSig = await crypto.subtle.sign('HMAC', aKey, new Uint8Array(0));
  const bSig = await crypto.subtle.sign('HMAC', bKey, new Uint8Array(0));
  const aArr = new Uint8Array(aSig);
  const bArr = new Uint8Array(bSig);
  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < aArr.length; i++) {
    result |= aArr[i] ^ bArr[i];
  }
  return result === 0;
}

/**
 * Validate the request's Origin header against the full CORS_ORIGINS list.
 * Returns the matching origin if found, otherwise falls back to the first
 * allowed origin (or localhost in development when no origins are configured).
 */
function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
  
  if (allowedOrigins.length === 0) {
    return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
  }
  
  // If the request origin is in the allowed list, return it
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // Origin doesn't match any allowed origin — return empty string
  // so the browser blocks the cross-origin request (CORS failure)
  return '';
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function isPublicPageRoute(pathname: string): boolean {
  return PUBLIC_PAGE_ROUTES.some((route) => {
    // Exact match for most routes
    if (pathname === route) return true;
    // Prefix match for /dashboard (catch-all route with [[...slug]])
    if (route === '/dashboard' && pathname.startsWith('/dashboard')) return true;
    return false;
  });
}

function isStaticFile(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/favicon') ||
    // PWA / manifest / service worker / browser files
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/workbox-*.js' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.endsWith('.webmanifest') ||
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|json|webmanifest)$/i.test(pathname)
  );
}

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some(p => pathname === p);
}

// ============================================
// Rate Limiting (Edge Runtime Compatible)
// ============================================

/**
 * In-memory rate limiter for the proxy layer.
 *
 * Uses a simple fixed-window algorithm. This is intentionally lightweight
 * because the proxy runs in Edge Runtime where Redis/Node.js APIs are
 * unavailable. The route-level rate limiter (@/lib/rate-limiter) uses Redis
 * with in-memory fallback as a second layer of defense.
 *
 * Trade-offs:
 *  - Pro: Zero external dependencies, works in Edge Runtime
 *  - Pro: Covers 100% of API routes from a single place
 *  - Con: In-memory store resets on server restart (acceptable for proxy-level)
 *  - Con: Not shared across instances in serverless (mitigated by route-level Redis limiter)
 */

type RateLimitTier = 'auth' | 'api' | 'ai' | 'export';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  auth:   { maxRequests: 10, windowMs: 60_000 },  // 10 req/min — aligned with Layer 2
  api:    { maxRequests: 100, windowMs: 60_000 },  // 100 req/min — aligned with Layer 2
  ai:     { maxRequests: 10, windowMs: 60_000 },  // 10 req/min — expensive AI calls
  export: { maxRequests: 10, windowMs: 60_000 },  // 10 req/min — heavy report generation
};

const rateLimitStore = new Map<string, RateLimitEntry>();

/** Timestamp of the last store cleanup pass */
let lastCleanup = Date.now();

/**
 * Remove expired entries to prevent unbounded memory growth.
 * Runs at most once every 60 seconds.
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Classify an API route path into its rate limit tier.
 *
 * Priority order (first match wins):
 *   1. /api/auth/...         -> auth   (login, register, forgot-password, reset-password, 2fa)
 *   2. /api/ai/...           -> ai     (chat, analyze-image, analyze-document, etc.)
 *   3. /api/reports/...      -> export (PDF, Excel, overview, financial, hr, etc.)
 *   4. /api/{entity}/export  -> export (any export sub-route)
 *   5. Everything else /api/ -> api    (projects, clients, tasks, invoices, etc.)
 *
 * Returns null for non-API routes (page routes don't need rate limiting).
 */
function classifyRateLimitTier(pathname: string): RateLimitTier | null {
  if (!pathname.startsWith('/api/')) return null;

  // Auth routes — strictest tier
  if (pathname.startsWith('/api/auth/')) return 'auth';

  // AI routes — expensive LLM calls
  if (pathname.startsWith('/api/ai/')) return 'ai';

  // Report/export routes — heavy generation
  if (pathname.startsWith('/api/reports/')) return 'export';

  // Export sub-paths under any entity (e.g., /api/projects/export)
  if (/\/api\/[^/]+\/export/.test(pathname)) return 'export';

  // Default API tier
  return 'api';
}

/**
 * Extract client IP from request headers.
 * Mirrors the logic in @/lib/rate-limiter getClientIP but is
 * self-contained to avoid importing Node.js-dependent code in Edge Runtime.
 */
function getProxyClientIP(headers: Headers): string {
  const ipRegex = /^[0-9a-fA-F.:]+$/;
  const maxIPLength = 45;

  function sanitize(ip: string): string {
    const cleaned = ip.trim();
    if (cleaned.length > maxIPLength || !ipRegex.test(cleaned)) return 'unknown';
    return cleaned;
  }

  // SECURITY: Trust rightmost IP in X-Forwarded-For (appended by the trusted proxy).
  // The leftmost IP can be spoofed by the client.
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const candidate = parts[parts.length - 1].trim(); // Rightmost = trusted proxy
    const sanitized = sanitize(candidate);
    if (sanitized !== 'unknown') return sanitized;
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    const sanitized = sanitize(realIP);
    if (sanitized !== 'unknown') return sanitized;
  }

  const cfIP = headers.get('cf-connecting-ip');
  if (cfIP) {
    const sanitized = sanitize(cfIP);
    if (sanitized !== 'unknown') return sanitized;
  }

  return 'unknown';
}

interface RateLimitCheckResult {
  allowed: boolean;
  tier: RateLimitTier;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a given IP + tier combination.
 * Uses a fixed-window algorithm: count requests within the current window,
 * reject if over limit, reset counter when the window expires.
 */
function checkProxyRateLimit(ip: string, tier: RateLimitTier): RateLimitCheckResult {
  cleanupRateLimitStore();

  const config = RATE_LIMIT_TIERS[tier];
  const key = `${tier}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or expired window → start fresh
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      allowed: true,
      tier,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Over limit → reject
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      tier,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Within limit → increment and allow
  entry.count++;
  return {
    allowed: true,
    tier,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// ============================================
// Security Headers
// ============================================

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate a unique nonce for this request (128-bit, 32 hex chars)
  // Used in CSP script-src to replace 'unsafe-inline' — only scripts with
  // a matching nonce attribute will execute, preventing XSS attacks.
  // crypto.randomUUID() is available in Edge Runtime.
  const nonce = crypto.randomUUID().replace(/-/g, '');

  // Skip static files
  if (isStaticFile(pathname)) {
    return NextResponse.next();
  }

  // Apply security headers to all responses
  // We need to handle this differently for different response types

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-CSRF-Token, Cache-Control');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return addSecurityHeaders(response, nonce);
  }

  // ============================================
  // Rate Limiting — first line of defense for ALL API routes
  // ============================================
  // Classify the route into a rate limit tier and enforce per-IP limits.
  // This runs BEFORE auth/CSRF checks so that abusive requests are rejected
  // early, before any expensive JWT verification or database queries.
  const rateLimitTier = classifyRateLimitTier(pathname);
  // Will hold rate-limit info to attach to successful response headers
  let rlInfo: { tier: RateLimitTier; remaining: number; resetTime: number; limit: number } | undefined;

  if (rateLimitTier) {
    const clientIp = getProxyClientIP(request.headers);
    const rlResult = checkProxyRateLimit(clientIp, rateLimitTier);

    if (!rlResult.allowed) {
      // Return 429 Too Many Requests with standard rate-limit headers
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': rlResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': RATE_LIMIT_TIERS[rateLimitTier].maxRequests.toString(),
            'X-RateLimit-Remaining': rlResult.remaining.toString(),
            'X-RateLimit-Reset': rlResult.resetTime.toString(),
            'X-RateLimit-Tier': rateLimitTier,
          },
        }
      );
      return addSecurityHeaders(response, nonce, rlInfo);
    }

    // Request is within limits — store info so we can attach headers to
    // the successful response downstream (via addSecurityHeaders).
    rlInfo = {
      tier: rlResult.tier,
      remaining: rlResult.remaining,
      resetTime: rlResult.resetTime,
      limit: RATE_LIMIT_TIERS[rateLimitTier].maxRequests,
    };
  }

  // CSRF validation for mutating requests on API routes
  // Uses Double Submit Cookie pattern:
  //   - The csrf_token cookie is set (httpOnly: false) when a user authenticates
  //   - The client reads the cookie and sends it as X-CSRF-Token header
  //   - The proxy compares the header value with the cookie value
  //   - CSRF_EXEMPT_PATHS (webhooks, auth, etc.) are skipped
  if (
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    !isCsrfExempt(pathname)
  ) {
    const csrfToken = request.headers.get('X-CSRF-Token');
    const cookieCsrf = request.cookies.get('csrf_token')?.value;
    if (!csrfToken || !cookieCsrf || !(await timingSafeCompare(csrfToken, cookieCsrf))) {
      const response = NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      );
      return addSecurityHeaders(response, nonce, rlInfo);
    }
  }

  // Public routes - no auth REQUIRED, but still process JWT if present
  // This is critical for /dashboard: the page is public (shows login form when not auth'd),
  // but when a JWT is present, we must set x-user-* headers so API calls from the page work.
  if (isPublicApiRoute(pathname) || isPublicPageRoute(pathname)) {
    // Try to verify JWT and set user headers even on public routes
    const pubToken = request.cookies.get(COOKIE_NAME)?.value ||
      (request.headers.get('authorization')?.startsWith('Bearer ')
        ? request.headers.get('authorization')!.substring(7)
        : null);

    if (pubToken && pubToken !== 'httpOnly') {
      try {
        const { payload } = await jose.jwtVerify(pubToken, JWT_SECRET(), {
          issuer: 'blueprint-saas',
          audience: 'blueprint-users',
        });

        // Check if password was changed after this token was issued
        // On public routes, stale tokens are simply treated as unauthenticated
        const pubIat = payload.iat as number | undefined;
        const pubPasswordChangedAt = payload.passwordChangedAt as number | undefined;
        if (pubIat && pubPasswordChangedAt && pubPasswordChangedAt > pubIat) {
          // Stale token — treat as unauthenticated on public route
          const response = NextResponse.next();
          return addSecurityHeaders(response, nonce, rlInfo);
        }

        const requestHeaders = new Headers(request.headers);
        // Strip any x-user-* headers from incoming requests to prevent forgery
        // These headers are set ONLY by this proxy after JWT verification
        for (const key of requestHeaders.keys()) {
          if (key.toLowerCase().startsWith('x-user-')) {
            requestHeaders.delete(key);
          }
        }
        requestHeaders.set('x-user-id', payload.userId as string);
        requestHeaders.set('x-user-email', payload.email as string);
        requestHeaders.set('x-user-role', payload.role as string);
        requestHeaders.set('x-user-name', encodeURIComponent((payload.name as string) || ''));
        if (payload.organizationId) {
          requestHeaders.set('x-organization-id', payload.organizationId as string);
        }
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        return addSecurityHeaders(response, nonce, rlInfo);
      } catch {
        // Invalid JWT on public route — just continue without auth headers
      }
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, nonce, rlInfo);
  }

  // Protected routes - verify JWT
  const token = request.cookies.get(COOKIE_NAME)?.value ||
    (request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.substring(7)
      : null);

  if (!token || token === 'httpOnly') {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { error: 'يرجى تسجيل الدخول' },
        { status: 401 }
      );
      return addSecurityHeaders(response, nonce, rlInfo);
    }
    // For page routes, redirect to dashboard (which shows login form)
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET(), {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    });

    // Check if password was changed after this token was issued
    const iat = payload.iat as number | undefined;
    const passwordChangedAt = payload.passwordChangedAt as number | undefined;
    if (iat && passwordChangedAt && passwordChangedAt > iat) {
      // Token was issued before password change — reject it
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.json(
          { error: 'يرجى تسجيل الدخول' },
          { status: 401 }
        );
        return addSecurityHeaders(response, nonce, rlInfo);
      }
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    const userId = payload.userId as string;
    const email = payload.email as string;
    const role = payload.role as string;
    const name = payload.name as string;
    const organizationId = payload.organizationId as string | undefined;

    // Set user identity headers for downstream route handlers
    const requestHeaders = new Headers(request.headers);
    // Strip any x-user-* headers from incoming requests to prevent forgery
    // These headers are set ONLY by this proxy after JWT verification
    for (const key of requestHeaders.keys()) {
      if (key.toLowerCase().startsWith('x-user-')) {
        requestHeaders.delete(key);
      }
    }
    requestHeaders.set('x-user-id', userId);
    requestHeaders.set('x-user-email', email);
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-user-name', encodeURIComponent(name || ''));
    if (organizationId) {
      requestHeaders.set('x-organization-id', organizationId);
    }

    // Generate and set CSRF cookie for authenticated users
    // This allows the client to read the cookie and include it in mutation requests
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Set CSRF cookie if not already present
    if (!request.cookies.get('csrf_token')?.value) {
      const csrfToken = crypto.randomUUID().replace(/-/g, '');
      response.cookies.set('csrf_token', csrfToken, {
        path: '/',
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return addSecurityHeaders(response, nonce, rlInfo);
  } catch {
    // Invalid/expired JWT
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { error: 'يرجى تسجيل الدخول' },
        { status: 401 }
      );
      return addSecurityHeaders(response, nonce, rlInfo);
    }
    // For page routes, redirect to dashboard (which shows login form)
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
}

// Matcher — run on all routes except static assets
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|public/).*)'],
};
