/**
 * Tests for the unified rate limiter module
 * Tests the RateLimiter class, getClientIP, and createRateLimitResponse
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Redis before imports
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    connect: jest.fn().mockResolvedValue(undefined),
    eval: jest.fn().mockResolvedValue([1, 1, Date.now() + 60000]),
    del: jest.fn().mockResolvedValue(1),
    isOpen: true,
  }),
}));

jest.mock('@/lib/logger', () => ({
  log: {
    warn: jest.fn(),
    security: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Set REDIS_URL to empty so rate limiter uses in-memory fallback
delete process.env.REDIS_URL;

import {
  RateLimiter,
  getClientIP,
  createRateLimitResponse,
  rateLimiters,
} from '@/lib/rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('in-memory rate limiting (no Redis)', () => {
    it('should allow requests within the limit', async () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        keyPrefix: 'test',
      });

      const result = await limiter.check('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should block requests exceeding the limit', async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        keyPrefix: 'test-block',
      });

      await limiter.check('10.0.0.1');
      await limiter.check('10.0.0.1');
      const result = await limiter.check('10.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should track different identifiers independently', async () => {
      const limiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        keyPrefix: 'test-independent',
      });

      const result1 = await limiter.check('ip-1');
      const result2 = await limiter.check('ip-2');
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should reset rate limit for an identifier', async () => {
      const limiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        keyPrefix: 'test-reset',
      });

      await limiter.check('192.168.1.2');
      const blocked = await limiter.check('192.168.1.2');
      expect(blocked.allowed).toBe(false);

      await limiter.reset('192.168.1.2');
      const afterReset = await limiter.check('192.168.1.2');
      expect(afterReset.allowed).toBe(true);
    });

    it('should return remaining requests count', async () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        keyPrefix: 'test-remaining',
      });

      const remaining = await limiter.getRemaining('10.0.0.5');
      expect(remaining).toBe(9);
    });
  });
});

describe('getClientIP', () => {
  it('should extract IP from x-forwarded-for header (rightmost)', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3',
    });
    expect(getClientIP(headers)).toBe('3.3.3.3');
  });

  it('should extract IP from x-real-ip header', () => {
    const headers = new Headers({
      'x-real-ip': '4.4.4.4',
    });
    expect(getClientIP(headers)).toBe('4.4.4.4');
  });

  it('should extract IP from cf-connecting-ip header', () => {
    const headers = new Headers({
      'cf-connecting-ip': '5.5.5.5',
    });
    expect(getClientIP(headers)).toBe('5.5.5.5');
  });

  it('should return unknown for empty headers', () => {
    const headers = new Headers();
    expect(getClientIP(headers)).toBe('unknown');
  });

  it('should reject invalid IP addresses', () => {
    const headers = new Headers({
      'x-forwarded-for': '<script>alert(1)</script>',
    });
    expect(getClientIP(headers)).toBe('unknown');
  });

  it('should accept IPv6 addresses', () => {
    const headers = new Headers({
      'x-real-ip': '::1',
    });
    expect(getClientIP(headers)).toBe('::1');
  });

  it('should work with request-like objects', () => {
    const mockRequest = {
      headers: new Headers({
        'x-real-ip': '6.6.6.6',
      }),
    };
    expect(getClientIP(mockRequest)).toBe('6.6.6.6');
  });
});

describe('createRateLimitResponse', () => {
  it('should create a 429 response with correct headers', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };

    const response = createRateLimitResponse(result, 'auth');
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('should include bilingual error messages', async () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };

    const arabicResponse = createRateLimitResponse(result, 'auth', 'ar');
    const arabicBody = await arabicResponse.json();
    expect(arabicBody.error.code).toBe('RATE_LIMIT_EXCEEDED');

    const englishResponse = createRateLimitResponse(result, 'auth', 'en');
    const englishBody = await englishResponse.json();
    expect(englishBody.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should support all rate limit types', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };

    const types: Array<'auth' | 'api' | 'public' | 'publicForm' | 'strict' | 'passwordReset' | 'emailVerification' | 'ai' | 'export'> = [
      'auth', 'api', 'public', 'publicForm', 'strict', 'passwordReset', 'emailVerification', 'ai', 'export',
    ];

    for (const type of types) {
      const response = createRateLimitResponse(result, type);
      expect(response.status).toBe(429);
    }
  });
});

describe('Pre-configured rate limiters', () => {
  it('should have all expected rate limiters', () => {
    expect(rateLimiters.auth).toBeDefined();
    expect(rateLimiters.api).toBeDefined();
    expect(rateLimiters.public).toBeDefined();
    expect(rateLimiters.publicForm).toBeDefined();
    expect(rateLimiters.strict).toBeDefined();
    expect(rateLimiters.passwordReset).toBeDefined();
    expect(rateLimiters.emailVerification).toBeDefined();
    expect(rateLimiters.ai).toBeDefined();
    expect(rateLimiters.export).toBeDefined();
  });

  it('should allow requests through pre-configured limiters', async () => {
    const result = await rateLimiters.api.check('test-ip-unique-1');
    expect(result.allowed).toBe(true);
  });
});
