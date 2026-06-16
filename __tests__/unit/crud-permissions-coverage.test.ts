/**
 * Tests for CRUD Permission Enforcement
 * Covers: getRequiredPermission, getRequiredPermissionForMethod, checkCrudPermission
 */

import { describe, it, expect, jest } from '@jest/globals';

// Use spy instead of jest.mock to avoid cross-test pollution in bun
import { log } from '@/lib/logger';
jest.spyOn(log, 'warn').mockImplementation(() => {});

import {
  getRequiredPermission,
  getRequiredPermissionForMethod,
  checkCrudPermission,
} from '@/app/api/utils/crud-permissions';
import { Permission } from '@/lib/auth/types';

// ═══════════════════════════════════════════════════════════════════════
// 1. getRequiredPermission
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD Permissions — getRequiredPermission', () => {
  it('should return project create permission', () => {
    expect(getRequiredPermission('project', 'create')).toBe(Permission.PROJECT_CREATE);
  });

  it('should return project read permission', () => {
    expect(getRequiredPermission('project', 'read')).toBe(Permission.PROJECT_READ);
  });

  it('should return task update permission', () => {
    expect(getRequiredPermission('task', 'update')).toBe(Permission.TASK_UPDATE);
  });

  it('should return invoice delete permission', () => {
    expect(getRequiredPermission('invoice', 'delete')).toBe(Permission.INVOICE_DELETE);
  });

  it('should return null for unknown resource', () => {
    expect(getRequiredPermission('unknown_resource', 'read')).toBeNull();
  });

  it('should return null for unmapped action', () => {
    // settings only has read and update
    expect(getRequiredPermission('settings', 'delete')).toBeNull();
    expect(getRequiredPermission('settings', 'create')).toBeNull();
  });

  it('should be case-insensitive for resource name', () => {
    expect(getRequiredPermission('Project', 'create')).toBe(Permission.PROJECT_CREATE);
  });

  it('should handle all resource types', () => {
    const resources = ['project', 'task', 'client', 'invoice', 'user', 'document', 'contract', 'contractor', 'bid', 'meeting'];
    for (const resource of resources) {
      const perm = getRequiredPermission(resource, 'read');
      expect(perm).not.toBeNull();
    }
  });

  it('should handle special resource mappings', () => {
    expect(getRequiredPermission('leave', 'read')).toBe(Permission.EMPLOYEE_READ);
    expect(getRequiredPermission('boq', 'create')).toBe(Permission.BUDGET_MANAGE);
    expect(getRequiredPermission('report', 'read')).toBe(Permission.REPORTS_READ);
    expect(getRequiredPermission('dashboard', 'read')).toBe(Permission.PROJECT_READ);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. getRequiredPermissionForMethod
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD Permissions — getRequiredPermissionForMethod', () => {
  it('should map GET to read', () => {
    expect(getRequiredPermissionForMethod('project', 'GET')).toBe(Permission.PROJECT_READ);
  });

  it('should map POST to create', () => {
    expect(getRequiredPermissionForMethod('project', 'POST')).toBe(Permission.PROJECT_CREATE);
  });

  it('should map PUT to update', () => {
    expect(getRequiredPermissionForMethod('project', 'PUT')).toBe(Permission.PROJECT_UPDATE);
  });

  it('should map PATCH to update', () => {
    expect(getRequiredPermissionForMethod('project', 'PATCH')).toBe(Permission.PROJECT_UPDATE);
  });

  it('should map DELETE to delete', () => {
    expect(getRequiredPermissionForMethod('project', 'DELETE')).toBe(Permission.PROJECT_DELETE);
  });

  it('should map HEAD to read', () => {
    expect(getRequiredPermissionForMethod('project', 'HEAD')).toBe(Permission.PROJECT_READ);
  });

  it('should return null for unknown method', () => {
    expect(getRequiredPermissionForMethod('project', 'OPTIONS')).toBeNull();
  });

  it('should be case-insensitive for method', () => {
    expect(getRequiredPermissionForMethod('project', 'get')).toBe(Permission.PROJECT_READ);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. checkCrudPermission
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD Permissions — checkCrudPermission', () => {
  it('ADMIN should have all CRUD permissions', () => {
    expect(checkCrudPermission('ADMIN', 'project', 'create')).toBe(true);
    expect(checkCrudPermission('ADMIN', 'project', 'read')).toBe(true);
    expect(checkCrudPermission('ADMIN', 'project', 'update')).toBe(true);
    expect(checkCrudPermission('ADMIN', 'project', 'delete')).toBe(true);
  });

  it('VIEWER should only have read permissions', () => {
    expect(checkCrudPermission('VIEWER', 'project', 'read')).toBe(true);
    expect(checkCrudPermission('VIEWER', 'project', 'create')).toBe(false);
    expect(checkCrudPermission('VIEWER', 'project', 'update')).toBe(false);
    expect(checkCrudPermission('VIEWER', 'project', 'delete')).toBe(false);
  });

  it('should return false for unknown resource', () => {
    expect(checkCrudPermission('ADMIN', 'unknown_resource', 'read')).toBe(false);
  });
});
