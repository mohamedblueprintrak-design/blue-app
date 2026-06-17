/**
 * Tests for CRUD Permission Enforcement Middleware
 * Tests the permission mapping and method-to-action mapping (pure functions).
 * Route wrapper tests are covered by integration tests.
 */

import { describe, it, expect } from '@jest/globals';

import {
  getRequiredPermission,
  getRequiredPermissionForMethod,
} from '@/app/api/utils/crud-permissions';
import { Permission } from '@/lib/auth/types';

// ═══════════════════════════════════════════════════════════════════════
// 1. Permission Mapping Tests
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD Permissions — getRequiredPermission', () => {
  it('should return create permission for project resource', () => {
    expect(getRequiredPermission('project', 'create')).toBe(Permission.PROJECT_CREATE);
  });

  it('should return read permission for task resource', () => {
    expect(getRequiredPermission('task', 'read')).toBe(Permission.TASK_READ);
  });

  it('should return update permission for invoice resource', () => {
    expect(getRequiredPermission('invoice', 'update')).toBe(Permission.INVOICE_UPDATE);
  });

  it('should return delete permission for client resource', () => {
    expect(getRequiredPermission('client', 'delete')).toBe(Permission.CLIENT_DELETE);
  });

  it('should return null for unknown resource', () => {
    expect(getRequiredPermission('unknown_resource', 'read')).toBeNull();
  });

  it('should return null for unmapped action on known resource', () => {
    expect(getRequiredPermission('settings', 'delete')).toBeNull();
  });

  it('should handle resource names case-insensitively', () => {
    expect(getRequiredPermission('PROJECT', 'read')).toBe(Permission.PROJECT_READ);
    expect(getRequiredPermission('Project', 'read')).toBe(Permission.PROJECT_READ);
  });

  it('should return correct permission for leave resource (mapped to EMPLOYEE_UPDATE)', () => {
    expect(getRequiredPermission('leave', 'create')).toBe(Permission.EMPLOYEE_UPDATE);
  });

  it('should return correct permission for boq resource (mapped to BUDGET_MANAGE)', () => {
    expect(getRequiredPermission('boq', 'create')).toBe(Permission.BUDGET_MANAGE);
  });

  it('should return correct permission for rfi resource (mapped to SUBMITTAL_*)', () => {
    expect(getRequiredPermission('rfi', 'create')).toBe(Permission.SUBMITTAL_CREATE);
    expect(getRequiredPermission('rfi', 'read')).toBe(Permission.SUBMITTAL_READ);
    expect(getRequiredPermission('rfi', 'update')).toBe(Permission.SUBMITTAL_UPDATE);
    expect(getRequiredPermission('rfi', 'delete')).toBe(Permission.SUBMITTAL_DELETE);
  });

  it('should return null for report resource create (only read mapped)', () => {
    expect(getRequiredPermission('report', 'create')).toBeNull();
  });

  it('should return BUDGET_MANAGE for budget resource create', () => {
    expect(getRequiredPermission('budget', 'create')).toBe(Permission.BUDGET_MANAGE);
  });

  it('should return PROJECT_READ for budget resource read', () => {
    expect(getRequiredPermission('budget', 'read')).toBe(Permission.PROJECT_READ);
  });

  it('should map all CRUD for contract resource', () => {
    expect(getRequiredPermission('contract', 'create')).toBe(Permission.CONTRACT_CREATE);
    expect(getRequiredPermission('contract', 'read')).toBe(Permission.CONTRACT_READ);
    expect(getRequiredPermission('contract', 'update')).toBe(Permission.CONTRACT_UPDATE);
    expect(getRequiredPermission('contract', 'delete')).toBe(Permission.CONTRACT_DELETE);
  });

  it('should map employee resource without create', () => {
    expect(getRequiredPermission('employee', 'create')).toBeNull();
    expect(getRequiredPermission('employee', 'read')).toBe(Permission.EMPLOYEE_READ);
    expect(getRequiredPermission('employee', 'update')).toBe(Permission.EMPLOYEE_UPDATE);
    expect(getRequiredPermission('employee', 'delete')).toBe(Permission.EMPLOYEE_DELETE);
  });

  it('should map dashboard resource with only read', () => {
    expect(getRequiredPermission('dashboard', 'read')).toBe(Permission.PROJECT_READ);
    expect(getRequiredPermission('dashboard', 'create')).toBeNull();
  });

  it('should map automation resource to SETTINGS permissions', () => {
    expect(getRequiredPermission('automation', 'create')).toBe(Permission.SETTINGS_UPDATE);
    expect(getRequiredPermission('automation', 'read')).toBe(Permission.SETTINGS_READ);
    expect(getRequiredPermission('automation', 'update')).toBe(Permission.SETTINGS_UPDATE);
    expect(getRequiredPermission('automation', 'delete')).toBe(Permission.SETTINGS_UPDATE);
  });

  it('should map tender resource to PROJECT permissions', () => {
    expect(getRequiredPermission('tender', 'create')).toBe(Permission.PROJECT_CREATE);
    expect(getRequiredPermission('tender', 'read')).toBe(Permission.PROJECT_READ);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. HTTP Method Mapping Tests
// ═══════════════════════════════════════════════════════════════════════

describe('CRUD Permissions — getRequiredPermissionForMethod', () => {
  it('should map GET to read action', () => {
    expect(getRequiredPermissionForMethod('task', 'GET')).toBe(Permission.TASK_READ);
  });

  it('should map POST to create action', () => {
    expect(getRequiredPermissionForMethod('task', 'POST')).toBe(Permission.TASK_CREATE);
  });

  it('should map PUT to update action', () => {
    expect(getRequiredPermissionForMethod('task', 'PUT')).toBe(Permission.TASK_UPDATE);
  });

  it('should map PATCH to update action', () => {
    expect(getRequiredPermissionForMethod('task', 'PATCH')).toBe(Permission.TASK_UPDATE);
  });

  it('should map DELETE to delete action', () => {
    expect(getRequiredPermissionForMethod('task', 'DELETE')).toBe(Permission.TASK_DELETE);
  });

  it('should map HEAD to read action', () => {
    expect(getRequiredPermissionForMethod('task', 'HEAD')).toBe(Permission.TASK_READ);
  });

  it('should return null for unknown HTTP method', () => {
    expect(getRequiredPermissionForMethod('task', 'OPTIONS')).toBeNull();
  });

  it('should handle lowercase method names', () => {
    expect(getRequiredPermissionForMethod('task', 'get')).toBe(Permission.TASK_READ);
    expect(getRequiredPermissionForMethod('task', 'post')).toBe(Permission.TASK_CREATE);
    expect(getRequiredPermissionForMethod('task', 'put')).toBe(Permission.TASK_UPDATE);
  });

  it('should return null for unmapped resource', () => {
    expect(getRequiredPermissionForMethod('nonexistent', 'GET')).toBeNull();
  });

  it('should map all methods for project resource', () => {
    expect(getRequiredPermissionForMethod('project', 'GET')).toBe(Permission.PROJECT_READ);
    expect(getRequiredPermissionForMethod('project', 'POST')).toBe(Permission.PROJECT_CREATE);
    expect(getRequiredPermissionForMethod('project', 'PUT')).toBe(Permission.PROJECT_UPDATE);
    expect(getRequiredPermissionForMethod('project', 'PATCH')).toBe(Permission.PROJECT_UPDATE);
    expect(getRequiredPermissionForMethod('project', 'DELETE')).toBe(Permission.PROJECT_DELETE);
  });
});
