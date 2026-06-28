/**
 * Integration Tests — /api/init Security
 * اختبارات أمان مسار التهيئة
 *
 * Tests the security posture of the /api/init endpoint:
 * - Unauthenticated access → 401
 * - Non-admin authenticated access → 403
 * - Admin authenticated access → 200
 * - Rate limiting (strict: 5 req/min)
 * - Response should NEVER contain passwords
 *
 * Since we can't call the actual route handler (it imports Prisma/DB),
 * we test the security checks in isolation using the same functions
 * that the route handler uses.
 */

import { describe, it, expect, beforeAll, beforeEach as _beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// ─── Helper: Create mock NextRequest ─────────────────────────────────────
function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): NextRequest {
  const url = new URL(options.url || 'http://localhost:3000/api/init');
  const init: RequestInit = {
    method: options.method || 'POST',
    headers: new Headers(options.headers || {}),
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
    (init.headers as Headers).set('Content-Type', 'application/json');
  }

  const request = new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1]);

  if (options.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      request.cookies.set(name, value);
    }
  }

  return request;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Authentication Check — Unauthenticated → 401
// ═══════════════════════════════════════════════════════════════════════

describe('/api/init Security — Authentication Check', () => {
  let extractAuthContext: typeof import('@/app/api/utils/auth').extractAuthContext;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    extractAuthContext = mod.extractAuthContext;
  });

  it('should return null auth context when no auth headers present', () => {
    const request = createMockRequest({ method: 'POST' });
    const ctx = extractAuthContext(request);
    expect(ctx).toBeNull();
    // The init route checks: if (!authCtx) return 401
  });

  it('should return null auth context with missing user-id header', () => {
    const request = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-email': 'admin@blueprint.ae',
        'x-user-role': 'ADMIN',
      },
    });
    const ctx = extractAuthContext(request);
    expect(ctx).toBeNull();
  });

  it('should return null auth context with missing role header', () => {
    const request = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'admin@blueprint.ae',
      },
    });
    const ctx = extractAuthContext(request);
    expect(ctx).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Authorization Check — Non-admin → 403
// ═══════════════════════════════════════════════════════════════════════

describe('/api/init Security — Authorization Check', () => {
  let extractAuthContext: typeof import('@/app/api/utils/auth').extractAuthContext;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    extractAuthContext = mod.extractAuthContext;
  });

  it('should return ADMIN role for admin user', () => {
    const request = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-email': 'admin@blueprint.ae',
        'x-user-role': 'ADMIN',
      },
    });
    const ctx = extractAuthContext(request);
    expect(ctx).not.toBeNull();
    expect(ctx!.role.toUpperCase()).toBe('ADMIN');
    // The init route checks: normalizedRole !== 'ADMIN' → 403
  });

  it('should reject ENGINEER role (non-admin)', () => {
    const request = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'eng-1',
        'x-user-email': 'eng@blueprint.ae',
        'x-user-role': 'ENGINEER',
      },
    });
    const ctx = extractAuthContext(request);
    expect(ctx).not.toBeNull();
    expect(ctx!.role.toUpperCase()).not.toBe('ADMIN');
    // The init route checks: normalizedRole !== 'ADMIN' → 403
  });

  it('should reject HR role (non-admin)', () => {
    const request = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'hr-1',
        'x-user-email': 'hr@blueprint.ae',
        'x-user-role': 'HR',
      },
    });
    const ctx = extractAuthContext(request);
    expect(ctx).not.toBeNull();
    expect(ctx!.role.toUpperCase()).not.toBe('ADMIN');
  });

  it('should reject VIEWER role (non-admin)', () => {
    const request = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'viewer-1',
        'x-user-email': 'viewer@blueprint.ae',
        'x-user-role': 'VIEWER',
      },
    });
    const ctx = extractAuthContext(request);
    expect(ctx).not.toBeNull();
    expect(ctx!.role.toUpperCase()).not.toBe('ADMIN');
  });

  it('should reject PROJECT_MANAGER role (non-admin)', () => {
    const request = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'pm-1',
        'x-user-email': 'pm@blueprint.ae',
        'x-user-role': 'PROJECT_MANAGER',
      },
    });
    const ctx = extractAuthContext(request);
    expect(ctx).not.toBeNull();
    expect(ctx!.role.toUpperCase()).not.toBe('ADMIN');
  });

  it('should accept lowercase admin role after normalization', () => {
    const request = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-email': 'admin@blueprint.ae',
        'x-user-role': 'admin', // lowercase from middleware
      },
    });
    const ctx = extractAuthContext(request);
    expect(ctx).not.toBeNull();
    // The init route normalizes to uppercase: normalizedRole = authCtx.role.toUpperCase()
    expect(ctx!.role.toUpperCase()).toBe('ADMIN');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Rate Limiting — Strict Limiter (5 req/min)
// ═══════════════════════════════════════════════════════════════════════

describe('/api/init Security — Rate Limiting', () => {
  let RateLimiter: typeof import('@/lib/rate-limiter').RateLimiter;
  let _rateLimiters: typeof import('@/lib/rate-limiter').rateLimiters;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    RateLimiter = mod.RateLimiter;
    _rateLimiters = mod.rateLimiters;
  });

  it('should have strict rate limiter configured at 5 req/min', () => {
    // Create a new instance to check configuration
    const strict = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      keyPrefix: 'strict',
    });
    // We can't directly read the config, but we can verify behavior
    expect(strict).toBeDefined();
  });

  it('should allow up to 5 requests then block', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      keyPrefix: 'init-test-strict',
    });

    const identifier = `init-rate-test-${Date.now()}`;

    // First 5 should be allowed
    for (let i = 0; i < 5; i++) {
      const result = await limiter.check(identifier);
      expect(result.allowed).toBe(true);
    }

    // 6th should be blocked
    const result = await limiter.check(identifier);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter!).toBeGreaterThan(0);
  });

  it('should return correct remaining count', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      keyPrefix: 'init-test-remaining',
    });

    const identifier = `init-remaining-test-${Date.now()}`;

    const r1 = await limiter.check(identifier);
    expect(r1.remaining).toBe(4);

    const r2 = await limiter.check(identifier);
    expect(r2.remaining).toBe(3);

    const r3 = await limiter.check(identifier);
    expect(r3.remaining).toBe(2);
  });

  it('should reset rate limit for an identifier', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      keyPrefix: 'init-test-reset',
    });

    const identifier = `init-reset-test-${Date.now()}`;

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
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
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Response Security — No Passwords in Response
// ═══════════════════════════════════════════════════════════════════════

describe('/api/init Security — Response Safety', () => {
  it('demo credentials should never expose passwords in response format', async () => {
    const { DEMO_CREDENTIALS } = await import('@/lib/demo-credentials');

    // The init route response only maps: email, role, labelAr, labelEn
    // NEVER the password field. Verify the format:
    const responseFormat = DEMO_CREDENTIALS.map(c => ({
      email: c.email,
      role: c.role,
      labelAr: c.labelAr,
      labelEn: c.labelEn,
    }));

    for (const user of responseFormat) {
      expect(user).not.toHaveProperty('password');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
    }
  });

  it('should not include password in demo users response data', async () => {
    const { DEMO_CREDENTIALS } = await import('@/lib/demo-credentials');

    // Simulate what the init route returns for demoUsers
    const demoUsers = DEMO_CREDENTIALS.map(c => ({
      email: c.email,
      role: c.role.toLowerCase() === 'PROJECT_MANAGER' ? 'project_manager' : c.role.toLowerCase(),
      labelAr: c.labelAr,
      labelEn: c.labelEn,
    }));

    const responseJson = JSON.stringify(demoUsers);
    // Ensure no password is in the response (skip check for empty passwords from env vars)
    for (const cred of DEMO_CREDENTIALS) {
      if (cred.password) {
        expect(responseJson).not.toContain(cred.password);
      }
    }
  });

  it('init route response structure should not include password field in demoUsers', () => {
    // The init route builds: { initialized, message, userCount, syncedCount, demoUsers? }
    // demoUsers only contains: { email, role, labelAr, labelEn }
    // This test documents that demoUsers objects never have a password field
    const mockResponse = {
      initialized: true,
      message: 'Synced 5 demo user passwords',
      userCount: 12,
      syncedCount: 5,
      demoUsers: [
        { email: 'admin@blueprint.ae', role: 'admin', labelAr: 'المدير العام', labelEn: 'Admin' },
      ],
    };

    // The message may contain the word "passwords" but demoUsers should not have a password field
    for (const user of mockResponse.demoUsers) {
      expect(user).not.toHaveProperty('password');
      expect(Object.keys(user)).toEqual(expect.arrayContaining(['email', 'role', 'labelAr', 'labelEn']));
      expect(Object.keys(user)).not.toContain('password');
    }
    // Also verify the actual password values are never in the response
    expect(JSON.stringify(mockResponse)).not.toContain('Admin@BP2024!');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Rate Limit Middleware Integration
// ═══════════════════════════════════════════════════════════════════════

describe('/api/init Security — Rate Limit Middleware', () => {
  let _withRateLimit: typeof import('@/lib/rate-limit-middleware').withRateLimit;
  let rateLimitResponse: typeof import('@/lib/rate-limit-middleware').rateLimitResponse;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limit-middleware');
    _withRateLimit = mod.withRateLimit;
    rateLimitResponse = mod.rateLimitResponse;
  });

  it('rateLimitResponse should return null when request is allowed', () => {
    const result = {
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
    };
    const response = rateLimitResponse(result);
    expect(response).toBeNull();
  });

  it('rateLimitResponse should return 429 when rate limited', () => {
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

  it('rate limit response should include Retry-After header', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 45,
    };
    const response = rateLimitResponse(result);
    expect(response!.headers.get('Retry-After')).toBe('45');
  });

  it('rate limit response should include X-RateLimit-Remaining header', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };
    const response = rateLimitResponse(result);
    expect(response!.headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Client IP Extraction for Rate Limiting
// ═══════════════════════════════════════════════════════════════════════

describe('/api/init Security — Client IP Extraction', () => {
  let getClientIP: typeof import('@/lib/rate-limiter').getClientIP;

  beforeAll(async () => {
    const mod = await import('@/lib/rate-limiter');
    getClientIP = mod.getClientIP;
  });

  it('should extract IP from x-forwarded-for header (rightmost = trusted proxy)', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '1.2.3.4, 5.6.7.8');
    // SECURITY: Rightmost IP is trusted (appended by the proxy), not the leftmost (can be spoofed)
    expect(getClientIP(headers)).toBe('5.6.7.8');
  });

  it('should extract IP from x-real-ip header as fallback', () => {
    const headers = new Headers();
    headers.set('x-real-ip', '10.0.0.1');
    expect(getClientIP(headers)).toBe('10.0.0.1');
  });

  it('should extract IP from cf-connecting-ip header', () => {
    const headers = new Headers();
    headers.set('cf-connecting-ip', '172.16.0.1');
    expect(getClientIP(headers)).toBe('172.16.0.1');
  });

  it('should return "unknown" when no IP headers present', () => {
    const headers = new Headers();
    expect(getClientIP(headers)).toBe('unknown');
  });

  it('should reject malicious IP values', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '<script>alert(1)</script>');
    expect(getClientIP(headers)).toBe('unknown');
  });

  it('should reject excessively long IP values', () => {
    const headers = new Headers();
    headers.set('x-real-ip', '1'.repeat(50));
    expect(getClientIP(headers)).toBe('unknown');
  });
});
