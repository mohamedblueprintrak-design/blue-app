/**
 * Unit Tests — API Utils
 * Tests auth.ts, rate-limit.ts, and db.ts utility functions
 */

 

// Set JWT_SECRET before importing auth modules
process.env.JWT_SECRET = 'test-jwt-secret-for-api-utils-tests-min-32-chars!';

import {
  getTokenFromRequest,
  generateToken,
  isAdmin,
  isHR,
  isAccountant,
  canApproveLeave,
  canApproveExpense,
  getJWTSecret,
} from '@/app/api/utils/auth';
import {
  getClientIP,
  rateLimiters,
  createRateLimitResponse as _createRateLimitResponse,
} from '@/lib/rate-limiter';
import type { RateLimitResult as _RateLimitResult } from '@/lib/rate-limiter';
import {
  getEmptyPaginationResponse,
} from '@/lib/db';

// ─── Helper: create mock NextRequest ────────────────────────────────────

function createMockRequest(options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  url?: string;
} = {}) {
  const headers = new Map(Object.entries(options.headers || {}));
  const cookies = new Map(Object.entries(options.cookies || {}).map(([k, v]) => [k, { value: v }]));

  return {
    headers: {
      get: (name: string) => headers.get(name) || null,
    },
    cookies: {
      get: (name: string) => cookies.get(name) || undefined,
    },
    nextUrl: {
      pathname: options.url || '/api/test',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// auth.ts — getTokenFromRequest
// ═══════════════════════════════════════════════════════════════════════

describe('auth.ts — getTokenFromRequest', () => {
  it('should extract token from Bearer header', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer my-jwt-token' },
    });
    expect(getTokenFromRequest(req as any)).toBe('my-jwt-token');
  });

  it('should return null when no authorization header', () => {
    const req = createMockRequest();
    expect(getTokenFromRequest(req as any)).toBeNull();
  });

  it('should return null when authorization header is not Bearer', () => {
    const req = createMockRequest({
      headers: { authorization: 'Basic abc123' },
    });
    expect(getTokenFromRequest(req as any)).toBeNull();
  });

  it('should fall back to cookie when header is missing', () => {
    const req = createMockRequest({
      cookies: { blue_token: 'cookie-jwt-token' },
    });
    expect(getTokenFromRequest(req as any)).toBe('cookie-jwt-token');
  });

  it('should fall back to cookie when header is httpOnly placeholder', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer httpOnly' },
      cookies: { blue_token: 'real-jwt-from-cookie' },
    });
    expect(getTokenFromRequest(req as any)).toBe('real-jwt-from-cookie');
  });

  it('should return null when cookie is missing and header is httpOnly', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer httpOnly' },
    });
    expect(getTokenFromRequest(req as any)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// auth.ts — generateToken
// ═══════════════════════════════════════════════════════════════════════

describe('auth.ts — generateToken', () => {
  it('should generate a JWT token string', async () => {
    const token = await generateToken('user-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should generate different tokens for different users', async () => {
    const token1 = await generateToken('user-1');
    const token2 = await generateToken('user-2');
    expect(token1).not.toBe(token2);
  });

  it('should produce a valid JWT format (3 parts)', async () => {
    const token = await generateToken('user-x');
    expect(token.split('.')).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// auth.ts — Role Checks
// ═══════════════════════════════════════════════════════════════════════

describe('auth.ts — isAdmin', () => {
  it('should return true for ADMIN role', () => {
    expect(isAdmin('ADMIN')).toBe(true);
  });

  it('should return false for non-admin role', () => {
    expect(isAdmin('ENGINEER')).toBe(false);
  });

  it('should return false for MANAGER role', () => {
    expect(isAdmin('MANAGER')).toBe(false);
  });
});

describe('auth.ts — isHR', () => {
  it('should return true for HR role', () => {
    expect(isHR('HR')).toBe(true);
  });

  it('should return false for non-HR role', () => {
    expect(isHR('ENGINEER')).toBe(false);
  });
});

describe('auth.ts — isAccountant', () => {
  it('should return true for ACCOUNTANT role', () => {
    expect(isAccountant('ACCOUNTANT')).toBe(true);
  });

  it('should return false for non-accountant role', () => {
    expect(isAccountant('ENGINEER')).toBe(false);
  });
});

describe('auth.ts — canApproveLeave', () => {
  it('should allow ADMIN to approve leaves', () => {
    expect(canApproveLeave('ADMIN')).toBe(true);
  });

  it('should allow HR to approve leaves', () => {
    expect(canApproveLeave('HR')).toBe(true);
  });

  it('should allow MANAGER to approve leaves', () => {
    expect(canApproveLeave('MANAGER')).toBe(true);
  });

  it('should not allow ENGINEER to approve leaves', () => {
    expect(canApproveLeave('ENGINEER')).toBe(false);
  });

  it('should not allow VIEWER to approve leaves', () => {
    expect(canApproveLeave('VIEWER')).toBe(false);
  });

  it('should handle lowercase roles', () => {
    expect(canApproveLeave('manager')).toBe(true);
  });
});

describe('auth.ts — canApproveExpense', () => {
  it('should allow ADMIN to approve expenses', () => {
    expect(canApproveExpense('ADMIN')).toBe(true);
  });

  it('should allow ACCOUNTANT to approve expenses', () => {
    expect(canApproveExpense('ACCOUNTANT')).toBe(true);
  });

  it('should allow MANAGER to approve expenses', () => {
    expect(canApproveExpense('MANAGER')).toBe(true);
  });

  it('should not allow HR to approve expenses', () => {
    expect(canApproveExpense('HR')).toBe(false);
  });

  it('should not allow ENGINEER to approve expenses', () => {
    expect(canApproveExpense('ENGINEER')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// auth.ts — getJWTSecret
// ═══════════════════════════════════════════════════════════════════════

describe('auth.ts — getJWTSecret', () => {
  it('should return a Uint8Array', () => {
    const secret = getJWTSecret();
    expect(secret).toBeInstanceOf(Uint8Array);
    expect(secret.length).toBeGreaterThan(0);
  });

  it('should return consistent secret', () => {
    const secret1 = getJWTSecret();
    const secret2 = getJWTSecret();
    expect(secret1).toEqual(secret2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// rate-limiter.ts — getClientIP (canonical)
// ═══════════════════════════════════════════════════════════════════════

describe('rate-limiter.ts — getClientIP', () => {
  it('should extract IP from x-forwarded-for header (rightmost = trusted proxy)', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    // SECURITY: Rightmost IP is trusted (appended by the proxy), not the leftmost (can be spoofed)
    expect(getClientIP(headers)).toBe('5.6.7.8');
  });

  it('should extract IP from x-real-ip header', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.1' });
    expect(getClientIP(headers)).toBe('10.0.0.1');
  });

  it('should return "unknown" when no IP headers present', () => {
    const headers = new Headers();
    expect(getClientIP(headers)).toBe('unknown');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// rate-limiter.ts — rateLimiters (canonical)
// ═══════════════════════════════════════════════════════════════════════

describe('rate-limiter.ts — rateLimiters', () => {
  it('should have auth, api, and public limiters', () => {
    expect(rateLimiters).toHaveProperty('auth');
    expect(rateLimiters).toHaveProperty('api');
    expect(rateLimiters).toHaveProperty('public');
  });

  it('should allow requests under limit', async () => {
    const result = await rateLimiters.api.check('test-ip-unit');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// db.ts — getEmptyPaginationResponse
// ═══════════════════════════════════════════════════════════════════════

describe('db.ts — getEmptyPaginationResponse', () => {
  it('should return empty data array', () => {
    const result = getEmptyPaginationResponse();
    expect(result.data).toEqual([]);
  });

  it('should return correct pagination meta', () => {
    const result = getEmptyPaginationResponse();
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('should indicate no next/prev pages', () => {
    const result = getEmptyPaginationResponse();
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.hasPrevPage).toBe(false);
  });
});

// safeDbOp removed — routes should handle DB errors explicitly
