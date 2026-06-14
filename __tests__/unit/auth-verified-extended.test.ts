/**
 * Tests for requireVerifiedAuth and related verified auth functions
 * Comprehensive coverage of JWT re-verification flow
 *
 * NOTE: This file does NOT mock `jose` to avoid cross-file module cache
 * pollution in Bun's test runner. Instead, it generates real JWT tokens
 * using SignJWT and verifies them through the real jwtVerify.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SignJWT } from 'jose';

// Set JWT_SECRET before any module that reads it is imported
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long!';

// Mock dependencies (except jose and @/lib/auth/jwt-secret)
const mockDbUserFindUnique = jest.fn<any>();

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: mockDbUserFindUnique,
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  log: {
    warn: jest.fn(),
    security: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/auth/modules/authorization', () => ({
  hasPermission: jest.fn().mockReturnValue(true),
  canAccessFinancials: jest.fn().mockReturnValue(false),
  canAccessHR: jest.fn().mockReturnValue(false),
  isAdmin: jest.fn().mockReturnValue(false),
}));

jest.mock('@/app/api/utils/response', () => ({
  unauthorizedResponse: jest.fn().mockReturnValue(new Response('Unauthorized', { status: 401 })),
  forbiddenResponse: jest.fn().mockReturnValue(new Response('Forbidden', { status: 403 })),
}));

import {
  requireVerifiedAuth,
  requireVerifiedPermission,
  requireVerifiedAdmin,
  requireVerifiedFinancialAccess,
  getTokenFromRequest,
  generateToken,
} from '@/app/api/utils/auth';
import { NextRequest } from 'next/server';
import type { Permission } from '@/lib/auth/types';
import { hasPermission as _hasPermission, isAdmin as _isAdmin, canAccessFinancials as _canAccessFinancials } from '@/lib/auth/modules/authorization';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';

// Cast the mocked authorization functions for test manipulation
const mockHasPermission = _hasPermission as unknown as jest.Mock;
const mockIsAdmin = _isAdmin as unknown as jest.Mock;
const mockCanAccessFinancials = _canAccessFinancials as unknown as jest.Mock;

/**
 * Generate a real JWT token for testing.
 * Uses the same signing configuration as the production auth module
 * (HS256, issuer 'blueprint-saas', audience 'blueprint-users') so that
 * the real jwtVerify inside requireVerifiedAuth will accept it.
 *
 * @param payload - JWT claims (userId, email, role, type, organizationId, etc.)
 * @param iat - Optional issued-at timestamp (seconds since epoch). Defaults to now.
 */
async function generateTestToken(payload: Record<string, unknown>, iat?: number): Promise<string> {
  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('blueprint-saas')
    .setAudience('blueprint-users')
    .setExpirationTime('15m');

  if (iat !== undefined) {
    builder.setIssuedAt(iat);
  } else {
    builder.setIssuedAt();
  }

  return builder.sign(getJwtSecretBytes());
}

function createMockRequest(options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  method?: string;
  url?: string;
}): NextRequest {
  const headers = new Headers(options.headers || {});
  const url = options.url || 'http://localhost:3000/api/test';
  const request = new NextRequest(url, {
    method: options.method || 'GET',
    headers,
  });
  if (options.cookies) {
    for (const [key, value] of Object.entries(options.cookies)) {
      request.cookies.set(key, value);
    }
  }
  return request;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. requireVerifiedAuth
// ═══════════════════════════════════════════════════════════════════════

describe('requireVerifiedAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when no auth headers present', async () => {
    const req = createMockRequest({});
    const result = await requireVerifiedAuth(req);
    expect('error' in result).toBe(true);
  });

  it('should return 401 when no JWT token present (forged headers)', async () => {
    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ADMIN',
      },
    });
    // No JWT cookie or Authorization header — headers are present but likely forged
    const result = await requireVerifiedAuth(req);
    expect('error' in result).toBe(true);
  });

  it('should return 401 when JWT verification fails', async () => {
    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ADMIN',
        'authorization': 'Bearer invalid-token',
      },
    });
    // 'invalid-token' is not a valid JWT — the real jwtVerify will throw

    const result = await requireVerifiedAuth(req);
    expect('error' in result).toBe(true);
  });

  it('should return 401 when JWT claims dont match headers (forgery)', async () => {
    // Generate a real JWT with a different userId than the headers claim
    const token = await generateTestToken({
      userId: 'different-user',
      email: 'test@test.com',
      role: 'ADMIN',
      type: 'access',
      organizationId: null,
    });

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1', // Doesn't match JWT's userId
        'x-user-email': 'test@test.com',
        'x-user-role': 'ADMIN',
        'authorization': `Bearer ${token}`,
      },
    });

    const result = await requireVerifiedAuth(req);
    expect('error' in result).toBe(true);
  });

  it('should return 401 when email in JWT doesnt match header', async () => {
    const token = await generateTestToken({
      userId: 'user-1',
      email: 'different@test.com',
      role: 'ADMIN',
      type: 'access',
      organizationId: null,
    });

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com', // Doesn't match JWT's email
        'x-user-role': 'ADMIN',
        'authorization': `Bearer ${token}`,
      },
    });

    const result = await requireVerifiedAuth(req);
    expect('error' in result).toBe(true);
  });

  it('should return 401 when role in JWT doesnt match header', async () => {
    const token = await generateTestToken({
      userId: 'user-1',
      email: 'test@test.com',
      role: 'VIEWER',
      type: 'access',
      organizationId: null,
    });

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ADMIN', // Doesn't match JWT's role
        'authorization': `Bearer ${token}`,
      },
    });

    const result = await requireVerifiedAuth(req);
    expect('error' in result).toBe(true);
  });

  it('should return 401 when 2FA-pending token is used', async () => {
    // JWT claims match headers, but token type is '2fa-pending' instead of 'access'
    const token = await generateTestToken({
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      type: '2fa-pending',
      organizationId: null,
    });

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ADMIN',
        'authorization': `Bearer ${token}`,
      },
    });
    mockDbUserFindUnique.mockResolvedValue(null); // No password change — let it pass to 2FA check

    const result = await requireVerifiedAuth(req);
    expect('error' in result).toBe(true);
  });

  it('should return 401 when password was changed after token was issued', async () => {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    const token = await generateTestToken({
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      type: 'access',
      organizationId: null,
    }, oneHourAgo);

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ADMIN',
        'authorization': `Bearer ${token}`,
      },
    });
    // Password changed after token was issued
    mockDbUserFindUnique.mockResolvedValue({
      passwordChangedAt: new Date(),
    });

    const result = await requireVerifiedAuth(req);
    expect('error' in result).toBe(true);
  });

  it('should return user when JWT claims match headers', async () => {
    const token = await generateTestToken({
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      type: 'access',
      organizationId: 'org-1',
    });

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ADMIN',
        'x-user-name': 'Test User',
        'x-organization-id': 'org-1',
        'authorization': `Bearer ${token}`,
      },
    });
    mockDbUserFindUnique.mockResolvedValue(null); // No password change

    const result = await requireVerifiedAuth(req);
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.userId).toBe('user-1');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.organizationId).toBe('org-1');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. requireVerifiedPermission
// ═══════════════════════════════════════════════════════════════════════

describe('requireVerifiedPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when auth fails', async () => {
    const req = createMockRequest({});
    const result = await requireVerifiedPermission(req, 'INVOICE_CREATE' as Permission);
    expect('error' in result).toBe(true);
  });

  it('should return 403 when user lacks permission', async () => {
    mockHasPermission.mockReturnValue(false);

    // Generate a valid JWT with claims matching the headers
    const token = await generateTestToken({
      userId: 'user-1',
      email: 'test@test.com',
      role: 'VIEWER',
      type: 'access',
      organizationId: null,
    });

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'VIEWER',
        'authorization': `Bearer ${token}`,
      },
    });
    mockDbUserFindUnique.mockResolvedValue(null);

    const result = await requireVerifiedPermission(req, 'INVOICE_CREATE' as Permission);
    expect('error' in result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. requireVerifiedAdmin
// ═══════════════════════════════════════════════════════════════════════

describe('requireVerifiedAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 for non-admin user', async () => {
    mockIsAdmin.mockReturnValue(false);

    // Generate a valid JWT with claims matching the headers
    const token = await generateTestToken({
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ENGINEER',
      type: 'access',
      organizationId: null,
    });

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ENGINEER',
        'authorization': `Bearer ${token}`,
      },
    });
    mockDbUserFindUnique.mockResolvedValue(null);

    const result = await requireVerifiedAdmin(req);
    expect('error' in result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. requireVerifiedFinancialAccess
// ═══════════════════════════════════════════════════════════════════════

describe('requireVerifiedFinancialAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 for user without financial access', async () => {
    mockCanAccessFinancials.mockReturnValue(false);

    // Generate a valid JWT with claims matching the headers
    const token = await generateTestToken({
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ENGINEER',
      type: 'access',
      organizationId: null,
    });

    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-1',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ENGINEER',
        'authorization': `Bearer ${token}`,
      },
    });
    mockDbUserFindUnique.mockResolvedValue(null);

    const result = await requireVerifiedFinancialAccess(req);
    expect('error' in result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. getTokenFromRequest
// ═══════════════════════════════════════════════════════════════════════

describe('getTokenFromRequest', () => {
  it('should extract Bearer token from Authorization header', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer my-jwt-token' },
    });
    const token = getTokenFromRequest(req);
    expect(token).toBe('my-jwt-token');
  });

  it('should fall back to cookie when Authorization is "httpOnly"', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer httpOnly' },
      cookies: { blue_token: 'cookie-jwt-token' },
    });
    const token = getTokenFromRequest(req);
    expect(token).toBe('cookie-jwt-token');
  });

  it('should fall back to cookie when no Authorization header', () => {
    const req = createMockRequest({
      cookies: { blue_token: 'cookie-jwt-token' },
    });
    const token = getTokenFromRequest(req);
    expect(token).toBe('cookie-jwt-token');
  });

  it('should return null when no token available', () => {
    const req = createMockRequest({});
    const token = getTokenFromRequest(req);
    expect(token).toBeNull();
  });

  it('should return null when cookie has no value', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer httpOnly' },
    });
    // No blue_token cookie set
    const token = getTokenFromRequest(req);
    expect(token).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. generateToken
// ═══════════════════════════════════════════════════════════════════════

describe('generateToken', () => {
  it('should generate a JWT token without throwing', async () => {
    // Uses the real jose.SignJWT with the real JWT secret
    const token = await generateToken('user-1');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
});
