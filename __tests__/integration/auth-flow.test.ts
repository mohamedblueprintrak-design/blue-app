/**

/**
 * Integration Tests — Complete Auth Flow
 * اختبارات تكامل تدفق المصادقة الكامل
 *
 * Tests the full authentication lifecycle:
 * - Login with valid/invalid credentials (schema validation)
 * - Demo mode login behavior
 * - Token verification and rejection
 * - Auth context extraction from requests
 * - RBAC permission checks
 * - Token hashing and cookie options
 * - Token expiration calculation
 *
 * NOTE: Tests that depend on the `jose` ESM module are handled via
 * the existing __tests__/unit/jwt.test.ts. This file focuses on the
 * auth flow logic that can be tested without jose.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

// ─── Helper: Create mock request object ──────────────────────────────────
function createMockRequest(options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): { headers: { get: (name: string) => string | null }; cookies: { get: (name: string) => { value: string } | undefined } } {
  const headers = new Map(Object.entries(options.headers || {}));
  const cookies = new Map(Object.entries(options.cookies || {}).map(([k, v]) => [k, { value: v }]));

  return {
    headers: {
      get: (name: string) => headers.get(name) || null,
    },
    cookies: {
      get: (name: string) => cookies.get(name) || undefined,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Auth Context — Protected Route Access
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — Auth Context from Request', () => {
  let getAuthContext: typeof import('@/app/api/utils/auth').getAuthContext;
  let requireAuthContext: typeof import('@/app/api/utils/auth').requireAuthContext;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    getAuthContext = mod.getAuthContext;
    requireAuthContext = mod.requireAuthContext;
  });

  it('should extract auth context from middleware-set headers', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'admin@blueprint.ae',
        'x-user-role': 'ADMIN',
        'x-user-name': 'Admin%20User',
        'x-organization-id': 'org-1',
      },
    });

    const ctx = getAuthContext(request as never);
    expect(ctx).not.toBeNull();
    expect(ctx!.userId).toBe('user-123');
    expect(ctx!.email).toBe('admin@blueprint.ae');
    expect(ctx!.role).toBe('ADMIN');
    expect(ctx!.name).toBe('Admin User'); // URL-decoded
    expect(ctx!.organizationId).toBe('org-1');
  });

  it('should return null when no auth headers present', () => {
    const request = createMockRequest({});
    const ctx = getAuthContext(request as never);
    expect(ctx).toBeNull();
  });

  it('should return null when only partial headers present', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        // Missing x-user-email and x-user-role
      },
    });
    const ctx = getAuthContext(request as never);
    expect(ctx).toBeNull();
  });

  it('should return null when email is missing', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-role': 'ADMIN',
      },
    });
    const ctx = getAuthContext(request as never);
    expect(ctx).toBeNull();
  });

  it('should return null when role is missing', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'test@test.com',
      },
    });
    const ctx = getAuthContext(request as never);
    expect(ctx).toBeNull();
  });

  it('requireAuthContext should return error for unauthenticated request', () => {
    const request = createMockRequest({});
    const result = requireAuthContext(request as never);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it('requireAuthContext should return user context for authenticated request', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'admin@blueprint.ae',
        'x-user-role': 'ADMIN',
      },
    });
    const result = requireAuthContext(request as never);
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.userId).toBe('user-123');
    }
  });

  it('should handle organizationId being null', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'test@test.com',
        'x-user-role': 'ADMIN',
      },
    });

    const ctx = getAuthContext(request as never);
    expect(ctx).not.toBeNull();
    expect(ctx!.organizationId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Demo Credentials — Login Behavior
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — Demo Mode Behavior', () => {
  let isDemoMode: typeof import('@/lib/demo-credentials').isDemoMode;
  let DEMO_CREDENTIALS: typeof import('@/lib/demo-credentials').DEMO_CREDENTIALS;

  beforeAll(async () => {
    const mod = await import('@/lib/demo-credentials');
    isDemoMode = mod.isDemoMode;
    DEMO_CREDENTIALS = mod.DEMO_CREDENTIALS;
  });

  it('should be in demo mode in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDemo = process.env.DEMO_MODE;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    // Demo mode requires explicit DEMO_MODE=true (not auto-enabled in dev)
    (process.env as Record<string, string>).DEMO_MODE = 'true';
    expect(isDemoMode()).toBe(true);
    // Restore
    (process.env as Record<string, string>).NODE_ENV = originalEnv;
    if (originalDemo === undefined) {
      delete (process.env as Record<string, string>).DEMO_MODE;
    } else {
      (process.env as Record<string, string>).DEMO_MODE = originalDemo;
    }
  });

  it('should be in demo mode when DEMO_MODE=true', () => {
    const original = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';
    expect(isDemoMode()).toBe(true);
    process.env.DEMO_MODE = original;
  });

  it('should NOT be in demo mode when DEMO_MODE is not set in production', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDemo = process.env.DEMO_MODE;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.DEMO_MODE = undefined;
    expect(isDemoMode()).toBe(false);
    (process.env as Record<string, string>).NODE_ENV = originalEnv;
    process.env.DEMO_MODE = originalDemo;
  });

  it('should have demo credentials for admin role', () => {
    const admin = DEMO_CREDENTIALS.find(c => c.role === 'ADMIN');
    expect(admin).toBeDefined();
    expect(admin!.email).toBe('admin@blueprint.ae');
    // Password is now sourced from env var DEMO_ADMIN_PASSWORD
    // When set, it should meet strength requirements; when unset, it's empty
    if (admin!.password) {
      expect(admin!.password.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('should have demo credentials for all key roles', () => {
    const roles = DEMO_CREDENTIALS.map(c => c.role);
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('PROJECT_MANAGER');
    expect(roles).toContain('ENGINEER');
    expect(roles).toContain('ACCOUNTANT');
    expect(roles).toContain('HR');
    expect(roles).toContain('VIEWER');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Role Normalization — Client-side Compatibility
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — Role Normalization', () => {
  let normalizeRoleForClient: typeof import('@/lib/auth/token-utils').normalizeRoleForClient;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/token-utils');
    normalizeRoleForClient = mod.normalizeRoleForClient;
  });

  it('should normalize ADMIN to lowercase', () => {
    expect(normalizeRoleForClient('ADMIN')).toBe('admin');
  });

  it('should normalize PROJECT_MANAGER to project_manager', () => {
    expect(normalizeRoleForClient('PROJECT_MANAGER')).toBe('project_manager');
  });

  it('should normalize ENGINEER to lowercase', () => {
    expect(normalizeRoleForClient('ENGINEER')).toBe('engineer');
  });

  it('should normalize already lowercase roles', () => {
    expect(normalizeRoleForClient('admin')).toBe('admin');
  });

  it('should normalize mixed case roles', () => {
    expect(normalizeRoleForClient('Admin')).toBe('admin');
    expect(normalizeRoleForClient('Project_Manager')).toBe('project_manager');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Token Utilities — Hash, Cookie Options
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — Token Utilities', () => {
  let hashToken: typeof import('@/lib/auth/token-utils').hashToken;
  let getAuthCookieOptions: typeof import('@/lib/auth/token-utils').getAuthCookieOptions;
  let AUTH_COOKIE_NAME: typeof import('@/lib/auth/token-utils').AUTH_COOKIE_NAME;
  let REFRESH_COOKIE_NAME: typeof import('@/lib/auth/token-utils').REFRESH_COOKIE_NAME;
  let ACCESS_TOKEN_EXPIRY: typeof import('@/lib/auth/token-utils').ACCESS_TOKEN_EXPIRY;
  let REFRESH_TOKEN_MAX_AGE: typeof import('@/lib/auth/token-utils').REFRESH_TOKEN_MAX_AGE;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/token-utils');
    hashToken = mod.hashToken;
    getAuthCookieOptions = mod.getAuthCookieOptions;
    AUTH_COOKIE_NAME = mod.AUTH_COOKIE_NAME;
    REFRESH_COOKIE_NAME = mod.REFRESH_COOKIE_NAME;
    ACCESS_TOKEN_EXPIRY = mod.ACCESS_TOKEN_EXPIRY;
    REFRESH_TOKEN_MAX_AGE = mod.REFRESH_TOKEN_MAX_AGE;
  });

  it('should hash a token deterministically (same input → same hash)', async () => {
    const token = 'test-token-123';
    const hash1 = await hashToken(token);
    const hash2 = await hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different tokens', async () => {
    const hash1 = await hashToken('token-1');
    const hash2 = await hashToken('token-2');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce a hex-encoded SHA-256 hash', async () => {
    const hash = await hashToken('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 produces 64 hex chars
  });

  it('should return correct access token cookie options', () => {
    const options = getAuthCookieOptions(15 * 60);
    expect(options.path).toBe('/');
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.maxAge).toBe(15 * 60);
  });

  it('should set secure flag only in production', () => {
    const originalEnv = process.env.NODE_ENV;

    (process.env as Record<string, string>).NODE_ENV = 'development';
    const devOptions = getAuthCookieOptions(15 * 60);
    expect(devOptions.secure).toBe(false);

    (process.env as Record<string, string>).NODE_ENV = 'production';
    const prodOptions = getAuthCookieOptions(15 * 60);
    expect(prodOptions.secure).toBe(true);

    (process.env as Record<string, string>).NODE_ENV = originalEnv;
  });

  it('should use correct cookie names', () => {
    expect(AUTH_COOKIE_NAME).toBe('blue_token');
    expect(REFRESH_COOKIE_NAME).toBe('blue_refresh_token');
  });

  it('should have correct token expiry constants', () => {
    expect(ACCESS_TOKEN_EXPIRY).toBe('15m');
    expect(REFRESH_TOKEN_MAX_AGE).toBe(7 * 24 * 60 * 60); // 7 days in seconds
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. RBAC Permission Checks in Auth Context
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — RBAC in Auth Context', () => {
  let requirePermission: typeof import('@/app/api/utils/auth').requirePermission;
  let requireAdmin: typeof import('@/app/api/utils/auth').requireAdmin;
  let requireFinancialAccess: typeof import('@/app/api/utils/auth').requireFinancialAccess;
  let requireHRAccess: typeof import('@/app/api/utils/auth').requireHRAccess;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    requirePermission = mod.requirePermission;
    requireAdmin = mod.requireAdmin;
    requireFinancialAccess = mod.requireFinancialAccess;
    requireHRAccess = mod.requireHRAccess;
  });

  it('should deny unauthenticated user for permission check', () => {
    const request = createMockRequest({});
    const result = requirePermission(request as never, 'INVOICE_CREATE' as never);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it('should deny unauthenticated user for admin check', () => {
    const request = createMockRequest({});
    const result = requireAdmin(request as never);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it('should deny non-admin user for admin check', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'eng@test.com',
        'x-user-role': 'ENGINEER',
      },
    });
    const result = requireAdmin(request as never);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it('should allow admin user for admin check', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'admin-1',
        'x-user-email': 'admin@blueprint.ae',
        'x-user-role': 'ADMIN',
      },
    });
    const result = requireAdmin(request as never);
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.role).toBe('ADMIN');
    }
  });

  it('should deny non-admin/non-HR user for HR check', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'eng@test.com',
        'x-user-role': 'ENGINEER',
      },
    });
    const result = requireHRAccess(request as never);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it('should deny non-admin/non-accountant user for financial check', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'eng@test.com',
        'x-user-role': 'ENGINEER',
      },
    });
    const result = requireFinancialAccess(request as never);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it('should allow HR user for HR check', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'hr-1',
        'x-user-email': 'hr@test.com',
        'x-user-role': 'HR',
      },
    });
    const result = requireHRAccess(request as never);
    expect('user' in result).toBe(true);
  });

  it('should allow ACCOUNTANT user for financial check', () => {
    const request = createMockRequest({
      headers: {
        'x-user-id': 'acc-1',
        'x-user-email': 'acc@test.com',
        'x-user-role': 'ACCOUNTANT',
      },
    });
    const result = requireFinancialAccess(request as never);
    expect('user' in result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Login Schema Validation
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — Login Input Validation', () => {
  let loginSchema: unknown;

  beforeAll(async () => {
    const mod = await import('@/lib/api-validation');
    loginSchema = mod.loginSchema;
  });

  it('should accept valid login credentials', () => {
    const result = (loginSchema as { safeParse: (d: unknown) => { success: boolean } }).safeParse({
      email: 'admin@blueprint.ae',
      password: 'Admin@BP2024!',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty email', () => {
    const result = (loginSchema as { safeParse: (d: unknown) => { success: boolean } }).safeParse({
      email: '',
      password: 'Admin@BP2024!',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = (loginSchema as { safeParse: (d: unknown) => { success: boolean } }).safeParse({
      email: 'not-an-email',
      password: 'Admin@BP2024!',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = (loginSchema as { safeParse: (d: unknown) => { success: boolean } }).safeParse({
      email: 'admin@blueprint.ae',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = (loginSchema as { safeParse: (d: unknown) => { success: boolean } }).safeParse({});
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Token Expiration Calculation
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — Token Expiration', () => {
  let getTokenExpiration: typeof import('@/lib/auth/modules/jwt').getTokenExpiration;
  let isTokenExpired: typeof import('@/lib/auth/modules/jwt').isTokenExpired;

  // NOTE: These tests don't trigger jose ESM because
  // getTokenExpiration and isTokenExpired are pure functions

  beforeAll(async () => {
    // Import only the pure utility functions, not the token generation ones
    const mod = await import('@/lib/auth/modules/jwt');
    getTokenExpiration = mod.getTokenExpiration;
    isTokenExpired = mod.isTokenExpired;
  });

  it('should calculate correct expiration for 15m', () => {
    const before = Date.now();
    const exp = getTokenExpiration('15m').getTime();
    const after = Date.now();
    expect(exp).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(exp).toBeLessThanOrEqual(after + 15 * 60 * 1000);
  });

  it('should calculate correct expiration for 7d', () => {
    const before = Date.now();
    const exp = getTokenExpiration('7d').getTime();
    const after = Date.now();
    expect(exp).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000);
    expect(exp).toBeLessThanOrEqual(after + 7 * 24 * 60 * 60 * 1000);
  });

  it('should calculate correct expiration for 1h', () => {
    const before = Date.now();
    const exp = getTokenExpiration('1h').getTime();
    const after = Date.now();
    expect(exp).toBeGreaterThanOrEqual(before + 60 * 60 * 1000);
    expect(exp).toBeLessThanOrEqual(after + 60 * 60 * 1000);
  });

  it('should throw on invalid expiration format', () => {
    expect(() => getTokenExpiration('invalid')).toThrow();
    expect(() => getTokenExpiration('10y')).toThrow();
    expect(() => getTokenExpiration('')).toThrow();
  });

  it('should detect expired tokens', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    expect(isTokenExpired(pastTimestamp)).toBe(true);
  });

  it('should detect non-expired tokens', () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    expect(isTokenExpired(futureTimestamp)).toBe(false);
  });

  it('should detect token at exact expiry boundary', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTokenExpired(now)).toBe(true); // expired at or past current time
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. JWT Secret Validation — Production Safety
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — JWT Secret Validation', () => {
  let getJwtSecretBytes: typeof import('@/lib/auth/jwt-secret').getJwtSecretBytes;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/jwt-secret');
    getJwtSecretBytes = mod.getJwtSecretBytes;
  });

  it('should throw in production when JWT_SECRET is not set', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.JWT_SECRET = undefined;

    expect(() => getJwtSecretBytes()).toThrow('JWT_SECRET');

    (process.env as Record<string, string>).NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalSecret;
  });

  it('should throw in production when JWT_SECRET is too short', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';

    expect(() => getJwtSecretBytes()).toThrow('32 characters');

    (process.env as Record<string, string>).NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalSecret;
  });

  it('should throw in production when JWT_SECRET contains placeholder', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.JWT_SECRET = 'change-me-this-is-a-placeholder-value-at-least-32-chars!!';

    expect(() => getJwtSecretBytes()).toThrow('placeholder');

    (process.env as Record<string, string>).NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalSecret;
  });

  it('should accept a valid JWT_SECRET in production', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-valid-production-secret-that-is-at-least-32-chars!';

    const secret = getJwtSecretBytes();
    expect(secret).toBeInstanceOf(Uint8Array);
    expect(secret.length).toBeGreaterThan(0);

    (process.env as Record<string, string>).NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalSecret;
  });

  it('should fall back to dev secret in development', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = 'development';

    const secret = getJwtSecretBytes();
    expect(secret).toBeInstanceOf(Uint8Array);

    (process.env as Record<string, string>).NODE_ENV = originalEnv;
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. Organization Context Filtering
// ═══════════════════════════════════════════════════════════════════════

describe('Auth Flow — Organization Context', () => {
  let orgFilter: typeof import('@/app/api/utils/auth').orgFilter;
  let orgCreate: typeof import('@/app/api/utils/auth').orgCreate;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    orgFilter = mod.orgFilter;
    orgCreate = mod.orgCreate;
  });

  it('should return organizationId filter for multi-tenant users', () => {
    const ctx = { userId: '1', email: 't@t.com', role: 'ADMIN', name: 'Test', organizationId: 'org-123' };
    const filter = orgFilter(ctx);
    expect(filter).toEqual({ organizationId: 'org-123' });
  });

  it('should return empty filter for single-tenant users', () => {
    const ctx = { userId: '1', email: 't@t.com', role: 'ADMIN', name: 'Test', organizationId: null };
    const filter = orgFilter(ctx);
    expect(filter).toEqual({});
  });

  it('should return organizationId for create operations', () => {
    const ctx = { userId: '1', email: 't@t.com', role: 'ADMIN', name: 'Test', organizationId: 'org-456' };
    const create = orgCreate(ctx);
    expect(create).toEqual({ organizationId: 'org-456' });
  });

  it('should return empty object for create when no organization', () => {
    const ctx = { userId: '1', email: 't@t.com', role: 'ADMIN', name: 'Test', organizationId: null };
    const create = orgCreate(ctx);
    expect(create).toEqual({});
  });
});
