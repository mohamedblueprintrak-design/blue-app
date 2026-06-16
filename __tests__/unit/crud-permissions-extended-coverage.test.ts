/**
 * Extended Tests for CRUD Permissions — Branch Coverage
 * Covers: withCrudPermissions, requireCrudPermission, requireMethodPermission
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { log } from '@/lib/logger';
jest.spyOn(log, 'warn').mockImplementation(() => {});

// Mock auth module
const mockRequireVerifiedAuth = jest.fn();
jest.mock('@/app/api/utils/auth', () => ({
  requireVerifiedAuth: (...args: unknown[]) => mockRequireVerifiedAuth(...args),
  orgFilter: jest.fn().mockReturnValue({ organizationId: 'org-1' }),
  orgCreate: jest.fn().mockReturnValue({ organizationId: 'org-1' }),
}));

// Mock authorization module
const mockHasPermission = jest.fn();
jest.mock('@/lib/auth/modules/authorization', () => ({
  hasPermission: (...args: unknown[]) => mockHasPermission(...args),
}));

// Mock response module
jest.mock('@/app/api/utils/response', () => ({
  forbiddenResponse: (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 403 }),
  unauthorizedResponse: (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 401 }),
}));

import {
  withCrudPermissions,
  requireCrudPermission,
  requireMethodPermission,
  getRequiredPermission,
  _checkCrudPermission,
} from '@/app/api/utils/crud-permissions';
import { Permission } from '@/lib/auth/types';
import { NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════
// 1. withCrudPermissions — branch coverage
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD — withCrudPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when auth fails', async () => {
    const mockError = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireVerifiedAuth.mockResolvedValue({ error: mockError });
    
    const handler = jest.fn();
    const wrapped = withCrudPermissions('task', handler);
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'GET' });
    const response = await wrapped(request);
    
    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return 403 when no permission mapping found', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN', organizationId: 'org-1' },
    });
    mockHasPermission.mockReturnValue(true);
    
    const handler = jest.fn();
    const wrapped = withCrudPermissions('unknown_resource', handler);
    
    const request = new NextRequest('http://localhost/api/unknown', { method: 'POST' });
    const response = await wrapped(request);
    
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return 403 when user lacks permission', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'VIEWER', organizationId: 'org-1' },
    });
    mockHasPermission.mockReturnValue(false);
    
    const handler = jest.fn();
    const wrapped = withCrudPermissions('task', handler);
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'POST' });
    const response = await wrapped(request);
    
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should call handler when user has permission', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN', organizationId: 'org-1' },
    });
    mockHasPermission.mockReturnValue(true);
    
    const handler = jest.fn().mockResolvedValue(new Response('OK'));
    const wrapped = withCrudPermissions('task', handler);
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'GET' });
    const response = await wrapped(request);
    
    expect(handler).toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it('should handle unknown HTTP method (allow pass-through)', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN', organizationId: 'org-1' },
    });
    
    const handler = jest.fn().mockResolvedValue(new Response('OK'));
    const wrapped = withCrudPermissions('task', handler);
    
    // OPTIONS method is not in METHOD_ACTION_MAP
    const request = new NextRequest('http://localhost/api/tasks', { method: 'OPTIONS' });
    const _response = await wrapped(request);
    
    expect(handler).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. requireCrudPermission — branch coverage
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD — requireCrudPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when auth fails', async () => {
    const mockError = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireVerifiedAuth.mockResolvedValue({ error: mockError });
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'POST' });
    const result = await requireCrudPermission(request, 'task', 'create');
    
    expect('error' in result).toBe(true);
  });

  it('should return error when user lacks permission', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'VIEWER', organizationId: 'org-1' },
    });
    mockHasPermission.mockReturnValue(false);
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'POST' });
    const result = await requireCrudPermission(request, 'task', 'create');
    
    expect('error' in result).toBe(true);
  });

  it('should return user context when permission exists and user has it', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN', organizationId: 'org-1' },
    });
    mockHasPermission.mockReturnValue(true);
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'POST' });
    const result = await requireCrudPermission(request, 'task', 'create');
    
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.permission).toBe(Permission.TASK_CREATE);
    }
  });

  it('should allow access when no permission mapping exists (null permission)', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'VIEWER', organizationId: 'org-1' },
    });
    
    const request = new NextRequest('http://localhost/api/unknown', { method: 'POST' });
    const result = await requireCrudPermission(request, 'unknown_resource', 'create');
    
    // When permission is null, the condition `permission && !hasPermission(...)` is false
    // so it returns the user context
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
  });

  it('should map POST to create action', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN', organizationId: 'org-1' },
    });
    mockHasPermission.mockReturnValue(true);
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'POST' });
    const result = await requireMethodPermission(request, 'task');
    
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.action).toBe('create');
    }
  });

  it('should map GET to read action', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN', organizationId: 'org-1' },
    });
    mockHasPermission.mockReturnValue(true);
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'GET' });
    const result = await requireMethodPermission(request, 'task');
    
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.action).toBe('read');
    }
  });

  it('should default to read for unknown method', async () => {
    mockRequireVerifiedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN', organizationId: 'org-1' },
    });
    mockHasPermission.mockReturnValue(true);
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'OPTIONS' });
    const result = await requireMethodPermission(request, 'task');
    
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.action).toBe('read');
    }
  });

  it('should return error when auth fails', async () => {
    const mockError = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireVerifiedAuth.mockResolvedValue({ error: mockError });
    
    const request = new NextRequest('http://localhost/api/tasks', { method: 'GET' });
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
