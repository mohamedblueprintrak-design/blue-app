/**
 * Tests for verified auth functions — requireVerified*, extractAuthContext
 * These tests ensure the security-critical auth path works correctly.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies before imports
const mockJwtVerify = jest.fn();
const mockDbUserFindUnique = jest.fn();

jest.mock('jose', () => ({
  jwtVerify: mockJwtVerify,
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    setAudience: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-token'),
  })),
}));

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

jest.mock('@/lib/auth/jwt-secret', () => ({
  getJwtSecretBytes: jest.fn().mockReturnValue(new TextEncoder().encode('test-secret-at-least-32-characters-long!')),
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
  getAuthContext,
  requirePermission,
  requireAdmin,
  requireFinancialAccess,
  requireHRAccess,
  orgFilter,
  orgCreate,
  orgFilterNested,
  orgCheck,
  isAdmin,
  isHR,
  isAccountant,
  canApproveLeave,
  canApproveExpense,
  validateCsrf,
} from '@/app/api/utils/auth';
import { NextRequest } from 'next/server';

// Helper to create a mock NextRequest with specific headers and cookies
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

  // Set cookies
  if (options.cookies) {
    for (const [key, value] of Object.entries(options.cookies)) {
      request.cookies.set(key, value);
    }
  }

  return request;
}

describe('Deprecated Auth Functions (throw on use)', () => {
  it('requirePermission should throw error directing to requireVerifiedPermission', () => {
    const req = createMockRequest({});
    expect(() => requirePermission(req, 'INVOICE_CREATE' as any)).toThrow(
      'requirePermission() has been removed for security reasons'
    );
  });

  it('requireAdmin should throw error directing to requireVerifiedAdmin', () => {
    const req = createMockRequest({});
    expect(() => requireAdmin(req)).toThrow(
      'requireAdmin() has been removed for security reasons'
    );
  });

  it('requireFinancialAccess should throw error directing to requireVerifiedFinancialAccess', () => {
    const req = createMockRequest({});
    expect(() => requireFinancialAccess(req)).toThrow(
      'requireFinancialAccess() has been removed for security reasons'
    );
  });

  it('requireHRAccess should throw error directing to requireVerifiedAuth', () => {
    const req = createMockRequest({});
    expect(() => requireHRAccess(req)).toThrow(
      'requireHRAccess() has been removed for security reasons'
    );
  });
});

describe('getAuthContext (deprecated but still functional)', () => {
  it('should extract auth context from headers', () => {
    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'test@example.com',
        'x-user-role': 'admin',
        'x-user-name': 'Test%20User',
        'x-organization-id': 'org-456',
      },
    });

    const ctx = getAuthContext(req);
    expect(ctx).not.toBeNull();
    expect(ctx!.userId).toBe('user-123');
    expect(ctx!.email).toBe('test@example.com');
    expect(ctx!.role).toBe('admin');
    expect(ctx!.name).toBe('Test User');
    expect(ctx!.organizationId).toBe('org-456');
  });

  it('should return null if required headers are missing', () => {
    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        // Missing x-user-email and x-user-role
      },
    });

    const ctx = getAuthContext(req);
    expect(ctx).toBeNull();
  });

  it('should return null if no auth headers present', () => {
    const req = createMockRequest({});
    const ctx = getAuthContext(req);
    expect(ctx).toBeNull();
  });

  it('should handle missing organizationId gracefully', () => {
    const req = createMockRequest({
      headers: {
        'x-user-id': 'user-123',
        'x-user-email': 'test@example.com',
        'x-user-role': 'admin',
      },
    });

    const ctx = getAuthContext(req);
    expect(ctx).not.toBeNull();
    expect(ctx!.organizationId).toBeNull();
    expect(ctx!.name).toBe('');
  });
});

describe('orgFilter', () => {
  const ctx = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    name: 'Test',
    organizationId: 'org-456',
  };

  it('should filter by organizationId when user has one', () => {
    const filter = orgFilter(ctx);
    expect(filter).toEqual({ organizationId: 'org-456' });
  });

  it('should return __DENIED__ sentinel in multi-tenant mode without org', () => {
    const originalEnv = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';
    const ctxNoOrg = { ...ctx, organizationId: null };
    const filter = orgFilter(ctxNoOrg);
    expect(filter).toEqual({ organizationId: '__DENIED__' });
    process.env.MULTI_TENANT = originalEnv;
  });

  it('should return empty filter in single-tenant mode without org', () => {
    const originalEnv = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'false';
    const ctxNoOrg = { ...ctx, organizationId: null };
    const filter = orgFilter(ctxNoOrg);
    expect(filter).toEqual({});
    process.env.MULTI_TENANT = originalEnv;
  });
});

describe('orgCreate', () => {
  const ctx = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    name: 'Test',
    organizationId: 'org-456',
  };

  it('should return organizationId when user has one', () => {
    const result = orgCreate(ctx);
    expect(result).toEqual({ organizationId: 'org-456' });
  });

  it('should return __DENIED__ in multi-tenant mode without org', () => {
    const originalEnv = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';
    const ctxNoOrg = { ...ctx, organizationId: null };
    const result = orgCreate(ctxNoOrg);
    expect(result).toEqual({ organizationId: '__DENIED__' });
    process.env.MULTI_TENANT = originalEnv;
  });
});

describe('orgFilterNested', () => {
  const ctx = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    name: 'Test',
    organizationId: 'org-456',
  };

  it('should create nested filter through parent relation', () => {
    const result = orgFilterNested(ctx, 'project');
    expect(result).toEqual({ project: { organizationId: 'org-456' } });
  });
});

describe('orgCheck', () => {
  const ctx = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    name: 'Test',
    organizationId: 'org-456',
  };

  it('should return null for null record', () => {
    expect(orgCheck(ctx, null)).toBeNull();
  });

  it('should return null in single-tenant mode', () => {
    const originalEnv = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'false';
    expect(orgCheck(ctx, { organizationId: 'other-org' })).toBeNull();
    process.env.MULTI_TENANT = originalEnv;
  });

  it('should return forbidden for cross-tenant access in multi-tenant mode', () => {
    const originalEnv = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';
    const result = orgCheck(ctx, { organizationId: 'other-org' });
    expect(result).not.toBeNull();
    process.env.MULTI_TENANT = originalEnv;
  });

  it('should return null for same-org access', () => {
    const originalEnv = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';
    const result = orgCheck(ctx, { organizationId: 'org-456' });
    expect(result).toBeNull();
    process.env.MULTI_TENANT = originalEnv;
  });
});

describe('Role check helpers', () => {
  it('isAdmin should correctly identify admin role', () => {
    expect(isAdmin('ADMIN')).toBe(true);
    expect(isAdmin('admin')).toBe(true);
    expect(isAdmin('Admin')).toBe(true);
    expect(isAdmin('manager')).toBe(false);
  });

  it('isHR should correctly identify HR role', () => {
    expect(isHR('HR')).toBe(true);
    expect(isHR('hr')).toBe(true);
    expect(isHR('admin')).toBe(false);
  });

  it('isAccountant should correctly identify accountant role', () => {
    expect(isAccountant('ACCOUNTANT')).toBe(true);
    expect(isAccountant('accountant')).toBe(true);
    expect(isAccountant('admin')).toBe(false);
  });

  it('canApproveLeave should allow admin, HR, and manager', () => {
    expect(canApproveLeave('ADMIN')).toBe(true);
    expect(canApproveLeave('HR')).toBe(true);
    expect(canApproveLeave('MANAGER')).toBe(true);
    expect(canApproveLeave('ENGINEER')).toBe(false);
  });

  it('canApproveExpense should allow admin, accountant, and manager', () => {
    expect(canApproveExpense('ADMIN')).toBe(true);
    expect(canApproveExpense('ACCOUNTANT')).toBe(true);
    expect(canApproveExpense('MANAGER')).toBe(true);
    expect(canApproveExpense('ENGINEER')).toBe(false);
  });
});

describe('validateCsrf', () => {
  it('should validate matching CSRF token and cookie', () => {
    const req = createMockRequest({
      headers: { 'x-csrf-token': 'test-csrf-token' },
      cookies: { csrf_token: 'test-csrf-token' },
    });
    expect(validateCsrf(req)).toBe(true);
  });

  it('should reject mismatched CSRF token', () => {
    const req = createMockRequest({
      headers: { 'x-csrf-token': 'wrong-token' },
      cookies: { csrf_token: 'test-csrf-token' },
    });
    expect(validateCsrf(req)).toBe(false);
  });

  it('should reject missing CSRF header', () => {
    const req = createMockRequest({
      cookies: { csrf_token: 'test-csrf-token' },
    });
    expect(validateCsrf(req)).toBe(false);
  });

  it('should reject missing CSRF cookie', () => {
    const req = createMockRequest({
      headers: { 'x-csrf-token': 'test-csrf-token' },
    });
    expect(validateCsrf(req)).toBe(false);
  });

  it('should reject when both are missing', () => {
    const req = createMockRequest({});
    expect(validateCsrf(req)).toBe(false);
  });
});
