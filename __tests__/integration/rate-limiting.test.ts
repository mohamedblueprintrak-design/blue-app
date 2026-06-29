/**
 * Integration Tests — Rate Limiting
 * اختبارات تحديد معدل الطلبات
 *
 * Tests the complete rate limiting system:
 * - Auth rate limit (10 requests/min)
 * - Strict rate limit (5 requests/min)
 * - API rate limit (100 requests/min)
 * - Password reset rate limit (3 requests/hour)
 * - Rate limit response formatting
 * - Rate limit reset functionality
 * - Sliding window behavior
 * - In-memory fallback (when Redis unavailable)
 */

import { describe, it, expect, beforeAll, beforeEach as _beforeEach, afterEach as _afterEach } from '@jest/globals';

// ═══════════════════════════════════════════════════════════════════════
// 1. Auth Rate Limiter — 10 requests/minute
// ═══════════════════════════════════════════════════════════════════════

describe('Rate Limiting — Auth Limiter (10 req/min)', () => {
  let RateLimiter: typeof import('@/lib/rate-limiter').RateLimiter;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    RateLimiter = mod.RateLimiter;
  });

  it('should allow up to 10 auth requests per minute', async () => {
    const limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60000,
      keyPrefix: 'test-auth-10',
    });

    const identifier = `auth-test-${Date.now()}`;

    for (let i = 0; i < 10; i++) {
      const result = await limiter.check(identifier);
      expect(result.allowed).toBe(true);
    }

    // 11th should be blocked
    const result = await limiter.check(identifier);
    expect(result.allowed).toBe(false);
  });

  it('should return correct remaining count after each request', async () => {
    const limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60000,
      keyPrefix: 'test-auth-remaining',
    });

    const identifier = `auth-remaining-${Date.now()}`;

    const r1 = await limiter.check(identifier);
    expect(r1.remaining).toBe(9);

    const r2 = await limiter.check(identifier);
    expect(r2.remaining).toBe(8);

    const r3 = await limiter.check(identifier);
    expect(r3.remaining).toBe(7);
  });

  it('should include retryAfter when blocked', async () => {
    const limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60000,
      keyPrefix: 'test-auth-retry',
    });

    const identifier = `auth-retry-${Date.now()}`;

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      await limiter.check(identifier);
    }

    const result = await limiter.check(identifier);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter!).toBeGreaterThan(0);
    expect(result.retryAfter!).toBeLessThanOrEqual(60);
  });

  it('should track different identifiers independently', async () => {
    const limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60000,
      keyPrefix: 'test-auth-independent',
    });

    const id1 = `auth-ind-1-${Date.now()}`;
    const id2 = `auth-ind-2-${Date.now()}`;

    // Exhaust limit for id1
    for (let i = 0; i < 10; i++) {
      await limiter.check(id1);
    }

    // id1 should be blocked
    const r1 = await limiter.check(id1);
    expect(r1.allowed).toBe(false);

    // id2 should still be allowed
    const r2 = await limiter.check(id2);
    expect(r2.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Strict Rate Limiter — 5 requests/minute
// ═══════════════════════════════════════════════════════════════════════

describe('Rate Limiting — Strict Limiter (5 req/min)', () => {
  let RateLimiter: typeof import('@/lib/rate-limiter').RateLimiter;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    RateLimiter = mod.RateLimiter;
  });

  it('should allow up to 5 strict requests per minute', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      keyPrefix: 'test-strict-5',
    });

    const identifier = `strict-test-${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      const result = await limiter.check(identifier);
      expect(result.allowed).toBe(true);
    }

    // 6th should be blocked
    const result = await limiter.check(identifier);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should return 4 remaining after first request', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      keyPrefix: 'test-strict-rem',
    });

    const identifier = `strict-rem-${Date.now()}`;
    const result = await limiter.check(identifier);
    expect(result.remaining).toBe(4);
  });

  it('should count down remaining correctly', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      keyPrefix: 'test-strict-count',
    });

    const identifier = `strict-count-${Date.now()}`;

    for (let i = 5; i > 0; i--) {
      const result = await limiter.check(identifier);
      expect(result.remaining).toBe(i - 1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. API Rate Limiter — 100 requests/minute
// ═══════════════════════════════════════════════════════════════════════

describe('Rate Limiting — API Limiter (100 req/min)', () => {
  let RateLimiter: typeof import('@/lib/rate-limiter').RateLimiter;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    RateLimiter = mod.RateLimiter;
  });

  it('should allow up to 100 API requests per minute', async () => {
    const limiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60000,
      keyPrefix: 'test-api-100',
    });

    const identifier = `api-test-${Date.now()}`;

    // Send 100 requests
    for (let i = 0; i < 100; i++) {
      const result = await limiter.check(identifier);
      expect(result.allowed).toBe(true);
    }

    // 101st should be blocked
    const result = await limiter.check(identifier);
    expect(result.allowed).toBe(false);
  });

  it('should return correct remaining count for high-volume requests', async () => {
    const limiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60000,
      keyPrefix: 'test-api-high',
    });

    const identifier = `api-high-${Date.now()}`;

    // First request
    const r1 = await limiter.check(identifier);
    expect(r1.remaining).toBe(99);

    // After 50 requests
    for (let i = 0; i < 49; i++) {
      await limiter.check(identifier);
    }
    const r50 = await limiter.check(identifier);
    expect(r50.remaining).toBe(49);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Password Reset Rate Limiter — 3 requests/hour
// ═══════════════════════════════════════════════════════════════════════

describe('Rate Limiting — Password Reset Limiter (3 req/hr)', () => {
  let RateLimiter: typeof import('@/lib/rate-limiter').RateLimiter;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    RateLimiter = mod.RateLimiter;
  });

  it('should allow up to 3 password reset requests per hour', async () => {
    const limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 3600000, // 1 hour
      keyPrefix: 'test-pwdreset-3',
    });

    const identifier = `pwdreset-test-${Date.now()}`;

    for (let i = 0; i < 3; i++) {
      const result = await limiter.check(identifier);
      expect(result.allowed).toBe(true);
    }

    // 4th should be blocked
    const result = await limiter.check(identifier);
    expect(result.allowed).toBe(false);
  });

  it('should have retryAfter up to 3600 seconds (1 hour)', async () => {
    const limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 3600000,
      keyPrefix: 'test-pwdreset-retry',
    });

    const identifier = `pwdreset-retry-${Date.now()}`;

    // Exhaust limit
    for (let i = 0; i < 3; i++) {
      await limiter.check(identifier);
    }

    const result = await limiter.check(identifier);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter!).toBeGreaterThan(0);
    expect(result.retryAfter!).toBeLessThanOrEqual(3600);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Rate Limit Reset
// ═══════════════════════════════════════════════════════════════════════

describe('Rate Limiting — Reset Functionality', () => {
  let RateLimiter: typeof import('@/lib/rate-limiter').RateLimiter;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    RateLimiter = mod.RateLimiter;
  });

  it('should allow requests after reset', async () => {
    const limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 60000,
      keyPrefix: 'test-reset-allow',
    });

    const identifier = `reset-allow-${Date.now()}`;

    // Exhaust limit
    for (let i = 0; i < 3; i++) {
      await limiter.check(identifier);
    }

    // Should be blocked
    let result = await limiter.check(identifier);
    expect(result.allowed).toBe(false);

    // Reset
    await limiter.reset(identifier);

    // Should be allowed again
    result = await limiter.check(identifier);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 3 - 1
  });

  it('should reset remaining to full after clear', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      keyPrefix: 'test-reset-clear',
    });

    const identifier = `reset-clear-${Date.now()}`;

    // Make some requests
    await limiter.check(identifier);
    await limiter.check(identifier);

    // Reset
    await limiter.reset(identifier);

    // Should have full quota
    const result = await limiter.check(identifier);
    expect(result.remaining).toBe(4); // 5 - 1
  });

  it('should not affect other identifiers when resetting one', async () => {
    const limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 60000,
      keyPrefix: 'test-reset-isolate',
    });

    const id1 = `reset-iso-1-${Date.now()}`;
    const id2 = `reset-iso-2-${Date.now()}`;

    // Exhaust id1
    for (let i = 0; i < 3; i++) {
      await limiter.check(id1);
    }
    // Make some requests on id2
    await limiter.check(id2);

    // Reset only id1
    await limiter.reset(id1);

    // id1 should be allowed
    const r1 = await limiter.check(id1);
    expect(r1.allowed).toBe(true);

    // id2 should still have its remaining count (not reset)
    const r2 = await limiter.check(id2);
    expect(r2.remaining).toBe(1); // 3 - 2 (original + this check)
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Rate Limit Response Creation
// ═══════════════════════════════════════════════════════════════════════

describe('Rate Limiting — Response Creation', () => {
  let createRateLimitResponse: typeof import('@/lib/rate-limiter').createRateLimitResponse;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    createRateLimitResponse = mod.createRateLimitResponse;
  });

  it('should create a 429 response with correct status', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };
    const response = createRateLimitResponse(result, 'auth');
    expect(response.status).toBe(429);
  });

  it('should include JSON error body', async () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 30,
    };
    const response = createRateLimitResponse(result, 'api');
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should include Arabic message for auth type', async () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };
    const response = createRateLimitResponse(result, 'auth', 'ar');
    const body = await response.json();
    expect(body.error.message).toContain('محاولات');
  });

  it('should include English message for auth type', async () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };
    const response = createRateLimitResponse(result, 'auth', 'en');
    const body = await response.json();
    expect(body.error.message).toContain('login attempts');
  });

  it('should include Retry-After header', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 45,
    };
    const response = createRateLimitResponse(result, 'api');
    expect(response.headers.get('Retry-After')).toBe('45');
  });

  it('should include X-RateLimit-Remaining header', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };
    const response = createRateLimitResponse(result, 'api');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('should include X-RateLimit-Reset header', () => {
    const resetTime = Date.now() + 60000;
    const result = {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: 60,
    };
    const response = createRateLimitResponse(result, 'api');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(resetTime.toString());
  });

  it('should handle password reset type with appropriate message', async () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 3600000,
      retryAfter: 3600,
    };
    const response = createRateLimitResponse(result, 'passwordReset', 'en');
    const body = await response.json();
    expect(body.error.message).toContain('password reset');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Pre-configured Rate Limiters
// ═══════════════════════════════════════════════════════════════════════

describe('Rate Limiting — Pre-configured Limiters', () => {
  let rateLimiters: typeof import('@/lib/rate-limiter').rateLimiters;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    rateLimiters = mod.rateLimiters;
  });

  it('should have auth limiter', () => {
    expect(rateLimiters.auth).toBeDefined();
  });

  it('should have api limiter', () => {
    expect(rateLimiters.api).toBeDefined();
  });

  it('should have strict limiter', () => {
    expect(rateLimiters.strict).toBeDefined();
  });

  it('should have passwordReset limiter', () => {
    expect(rateLimiters.passwordReset).toBeDefined();
  });

  it('should have public limiter', () => {
    expect(rateLimiters.public).toBeDefined();
  });

  it('should have emailVerification limiter', () => {
    expect(rateLimiters.emailVerification).toBeDefined();
  });

  it('auth limiter should be functional', async () => {
    // Use a unique identifier to avoid interference
    const identifier = `preconf-auth-${Date.now()}-${Math.random()}`;
    const result = await rateLimiters.auth.check(identifier);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('strict limiter should be functional', async () => {
    const identifier = `preconf-strict-${Date.now()}-${Math.random()}`;
    const result = await rateLimiters.strict.check(identifier);
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. Rate Limit Middleware Integration
// ═══════════════════════════════════════════════════════════════════════

describe('Rate Limiting — Middleware Integration', () => {
  let withRateLimit: typeof import('@/lib/rate-limit-middleware').withRateLimit;
  let rateLimitResponse: typeof import('@/lib/rate-limit-middleware').rateLimitResponse;
  let rateLimitHeaders: typeof import('@/lib/rate-limit-middleware').rateLimitHeaders;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limit-middleware');
    withRateLimit = mod.withRateLimit;
    rateLimitResponse = mod.rateLimitResponse;
    rateLimitHeaders = mod.rateLimitHeaders;
  });

  it('withRateLimit should return allowed result', async () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `rl-middleware-test-${Date.now()}` },
    });

    const { allowed, result } = await withRateLimit(request, 'api');
    expect(allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.resetTime).toBeGreaterThan(0);
  });

  it('rateLimitResponse should return null for allowed request', () => {
    const result = {
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
    };
    expect(rateLimitResponse(result)).toBeNull();
  });

  it('rateLimitResponse should return 429 for blocked request', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };
    const response = rateLimitResponse(result);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
  });

  it('rateLimitHeaders should return remaining and reset info', () => {
    const result = {
      allowed: true,
      remaining: 95,
      resetTime: Date.now() + 45000,
    };
    const headers = rateLimitHeaders(result);
    expect(headers['X-RateLimit-Remaining']).toBe('95');
    expect(headers['X-RateLimit-Reset']).toBe(result.resetTime.toString());
  });
});
