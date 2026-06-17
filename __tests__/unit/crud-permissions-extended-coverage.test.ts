/**
 * Extended Tests for CRUD Permissions — Branch Coverage
 * Covers: withCrudPermissions, requireCrudPermission, requireMethodPermission
 *
 * Uses REAL JWT tokens with real jose verification (same pattern as
 * auth-verified-extended.test.ts) because jest.mock() does not intercept
 * ESM imports in ts-jest ESM mode.
 *
 * Uses real roles that naturally have/lack permissions:
 * - ADMIN has all permissions
 * - VIEWER lacks TASK_CREATE
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SignJWT } from 'jose';

// JWT_SECRET is already set in jest.setup.ts

// Mock DB with spyOn (works with ESM, unlike jest.mock)
import { db } from '@/lib/db';
const spyDbUserFindUnique = jest.spyOn(db.user, 'findUnique');

import { log } from '@/lib/logger';
jest.spyOn(log, 'warn').mockImplementation(() => {});
jest.spyOn(log, 'error').mockImplementation(() => {});
jest.spyOn(log, 'info').mockImplementation(() => {});

import {
  withCrudPermissions,
  requireCrudPermission,
  requireMethodPermission,
  getRequiredPermission,
} from '@/app/api/utils/crud-permissions';
import { Permission } from '@/lib/auth/types';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';
import { NextRequest } from 'next/server';

/**
 * Generate a real JWT token for testing.
 */
async function generateTestToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('blueprint-saas')
    .setAudience('blueprint-users')
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(getJwtSecretBytes());
}

function createMockRequest(options: {
  headers?: Record<string, string>;
  method?: string;
  url?: string;
}): NextRequest {
  const headers = new Headers(options.headers || {});
  const url = options.url || 'http://localhost:3000/api/test';
  return new NextRequest(url, {
    method: options.method || 'GET',
    headers,
  });
}

/**
 * Create an authenticated request with real JWT + matching x-user-* headers.
 */
async function createAuthRequest(options: {
  userId?: string;
  email?: string;
  role?: string;
  organizationId?: string | null;
  method?: string;
  url?: string;
}): Promise<NextRequest> {
  const userId = options.userId || 'user-1';
  const email = options.email || 'test@test.com';
  const role = options.role || 'ADMIN';
  const organizationId = options.organizationId ?? null;

  const token = await generateTestToken({
    userId,
    email,
    role,
    type: 'access',
    organizationId,
  });

  return createMockRequest({
    method: options.method || 'GET',
    url: options.url,
    headers: {
      'x-user-id': userId,
      'x-user-email': email,
      'x-user-role': role,
      'x-organization-id': organizationId || '',
      'authorization': `Bearer ${token}`,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 1. withCrudPermissions — branch coverage
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD — withCrudPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no passwordChangedAt → password check passes
    spyDbUserFindUnique.mockResolvedValue(null as any);
  });

  it('should return 401 when auth fails (no auth headers)', async () => {
    const handler = jest.fn();
    const wrapped = withCrudPermissions('task', handler);

    const request = createMockRequest({ method: 'GET' });
    const response = await wrapped(request);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return 403 when no permission mapping found', async () => {
    const request = await createAuthRequest({
      role: 'ADMIN',
      method: 'POST',
      url: 'http://localhost:3000/api/unknown',
    });

    const handler = jest.fn();
    const wrapped = withCrudPermissions('unknown_resource', handler);

    const response = await wrapped(request);

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return 403 when user lacks permission (VIEWER cannot create tasks)', async () => {
    const request = await createAuthRequest({
      role: 'VIEWER',
      method: 'POST',
      url: 'http://localhost:3000/api/tasks',
    });

    const handler = jest.fn();
    const wrapped = withCrudPermissions('task', handler);

    const response = await wrapped(request);

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should call handler when user has permission (ADMIN can read tasks)', async () => {
    const request = await createAuthRequest({
      role: 'ADMIN',
      method: 'GET',
      url: 'http://localhost:3000/api/tasks',
    });

    const handler = jest.fn().mockResolvedValue(new Response('OK'));
    const wrapped = withCrudPermissions('task', handler);

    const response = await wrapped(request);

    expect(handler).toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it('should handle unknown HTTP method (allow pass-through)', async () => {
    const request = await createAuthRequest({
      role: 'ADMIN',
      method: 'OPTIONS',
      url: 'http://localhost:3000/api/tasks',
    });

    const handler = jest.fn().mockResolvedValue(new Response('OK'));
    const wrapped = withCrudPermissions('task', handler);

    await wrapped(request);

    expect(handler).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. requireCrudPermission — branch coverage
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD — requireCrudPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spyDbUserFindUnique.mockResolvedValue(null as any);
  });

  it('should return error when auth fails', async () => {
    const request = createMockRequest({ method: 'POST' });
    const result = await requireCrudPermission(request, 'task', 'create');

    expect('error' in result).toBe(true);
  });

  it('should return error when user lacks permission (VIEWER cannot create tasks)', async () => {
    const request = await createAuthRequest({
      role: 'VIEWER',
      method: 'POST',
    });

    const result = await requireCrudPermission(request, 'task', 'create');

    expect('error' in result).toBe(true);
  });

  it('should return user context when permission exists and user has it (ADMIN)', async () => {
    const request = await createAuthRequest({
      role: 'ADMIN',
      method: 'POST',
    });

    const result = await requireCrudPermission(request, 'task', 'create');

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.permission).toBe(Permission.TASK_CREATE);
    }
  });

  it('should allow access when no permission mapping exists (null permission)', async () => {
    // For unknown_resource, getRequiredPermission returns null
    // The condition `permission && !hasPermission(...)` is false when permission is null
    // So it returns the user context
    const request = await createAuthRequest({
      role: 'VIEWER',
      method: 'POST',
    });

    const result = await requireCrudPermission(request, 'unknown_resource', 'create');

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.permission).toBeNull();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. requireMethodPermission — branch coverage
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD — requireMethodPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spyDbUserFindUnique.mockResolvedValue(null as any);
  });

  it('should map POST to create action', async () => {
    const request = await createAuthRequest({
      role: 'ADMIN',
      method: 'POST',
    });

    const result = await requireMethodPermission(request, 'task');

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.action).toBe('create');
    }
  });

  it('should map GET to read action', async () => {
    const request = await createAuthRequest({
      role: 'ADMIN',
      method: 'GET',
    });

    const result = await requireMethodPermission(request, 'task');

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.action).toBe('read');
    }
  });

  it('should default to read for unknown method', async () => {
    const request = await createAuthRequest({
      role: 'ADMIN',
      method: 'OPTIONS',
    });

    const result = await requireMethodPermission(request, 'task');

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.action).toBe('read');
    }
  });

  it('should return error when auth fails', async () => {
    const request = createMockRequest({ method: 'GET' });
    const result = await requireMethodPermission(request, 'task');

    expect('error' in result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Additional getRequiredPermission tests for special resources
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD — special resource mappings', () => {
  it('should handle employee resource (no create permission)', () => {
    expect(getRequiredPermission('employee', 'create')).toBeNull();
    expect(getRequiredPermission('employee', 'read')).toBe(Permission.EMPLOYEE_READ);
  });

  it('should handle all special resource mappings', () => {
    expect(getRequiredPermission('rfi', 'create')).toBe(Permission.SUBMITTAL_CREATE);
    expect(getRequiredPermission('tender', 'create')).toBe(Permission.PROJECT_CREATE);
    expect(getRequiredPermission('boq', 'create')).toBe(Permission.BUDGET_MANAGE);
    expect(getRequiredPermission('budget', 'read')).toBe(Permission.PROJECT_READ);
    expect(getRequiredPermission('equipment', 'read')).toBe(Permission.INVENTORY_READ);
    expect(getRequiredPermission('automation', 'create')).toBe(Permission.SETTINGS_UPDATE);
    expect(getRequiredPermission('design_phase', 'create')).toBe(Permission.PROJECT_CREATE);
    expect(getRequiredPermission('workflow_template', 'read')).toBe(Permission.SETTINGS_READ);
    expect(getRequiredPermission('municipality_correspondence', 'read')).toBe(Permission.PROJECT_READ);
    expect(getRequiredPermission('marketing_campaign', 'create')).toBe(Permission.CLIENT_CREATE);
  });
});
