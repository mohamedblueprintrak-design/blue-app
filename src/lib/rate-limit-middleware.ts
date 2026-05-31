/**
 * Rate Limiting Middleware for API Routes
 * وسيط تحديد معدل الطلبات لمسارات API
 *
 * Provides a simple middleware function that API routes can use to enforce
 * rate limiting via the Redis-based rate limiter (with in-memory fallback).
 *
 * Usage:
 *   import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
 *
 *   export async function POST(request: NextRequest) {
 *     const { allowed, result } = await withRateLimit(request, 'auth');
 *     const blocked = rateLimitResponse(result);
 *     if (blocked) return blocked;
 *     // ... proceed with normal handler logic
 *   }
 */

import { rateLimiters, getClientIP, type RateLimitResult } from '@/lib/rate-limiter';
import { NextRequest, NextResponse } from 'next/server';

export type RateLimiterName =
  | 'auth'
  | 'api'
  | 'public'
  | 'publicForm'
  | 'strict'
  | 'passwordReset'
  | 'emailVerification'
  | 'ai'
  | 'export';

/**
 * Check rate limit for a given request using the specified limiter.
 *
 * @param request - The incoming NextRequest (used to extract client IP)
 * @param limiter - Which pre-configured limiter to use (default: 'api')
 * @returns Object with `allowed` boolean and the full `RateLimitResult`
 */
export async function withRateLimit(
  request: NextRequest | Request,
  limiter: RateLimiterName = 'api',
): Promise<{ allowed: boolean; result: RateLimitResult }> {
  const clientIp = getClientIP(request.headers);
  const result = await rateLimiters[limiter].check(clientIp);
  return { allowed: result.allowed, result };
}

/**
 * Build a 429 response if the rate limit was exceeded.
 * Returns `null` if the request is allowed (caller should continue).
 *
 * The response includes standard rate-limit headers:
 *  - Retry-After
 *  - X-RateLimit-Remaining
 *  - X-RateLimit-Reset
 *
 * @param result - The RateLimitResult from `withRateLimit()`
 * @returns A NextResponse with status 429, or null if allowed
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse | null {
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      },
    );
  }
  return null;
}

/**
 * Build rate-limit informational headers to attach to successful responses.
 * This lets clients see their remaining quota.
 *
 * @param result - The RateLimitResult from `withRateLimit()`
 * @returns Headers object that can be spread into a NextResponse
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
}
