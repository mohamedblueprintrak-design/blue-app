/**
 * Unit Tests — RBAC (Role-Based Access Control)
 * اختبارات التحكم في الصلاحيات حسب الأدوار
 *
 * Uses the ACTUAL permission system from @/lib/auth/types and @/lib/auth/modules/authorization
 * to ensure tests match the real implementation.
 */

import { Permission, UserRoleValues } from '@/lib/auth/types';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isRoleAtLeast,
  normalizeRole,
  canAccessResource,
  isAdmin,
  canManageUsers,
  canManageProjects,
  canAccessFinancials,
  canAccessHR,
} from '@/lib/auth/modules/authorization';

// ============================================
// Permission Checks
// ============================================

describe('RBAC — hasPermission', () => {
  it('ADMIN should have all permissions', () => {
    expect(hasPermission(UserRoleValues.ADMIN, Permission.USER_CREATE)).toBe(true);
    expect(hasPermission(UserRoleValues.ADMIN, Permission.PROJECT_DELETE)).toBe(true);
    expect(hasPermission(UserRoleValues.ADMIN, Permission.INVOICE_CREATE)).toBe(true);
    expect(hasPermission(UserRoleValues.ADMIN, Permission.SETTINGS_UPDATE)).toBe(true);
    expect(hasPermission(UserRoleValues.ADMIN, Permission.BUDGET_MANAGE)).toBe(true);
  });

  it('VIEWER should have read-only permissions', () => {
    expect(hasPermission(UserRoleValues.VIEWER, Permission.PROJECT_READ)).toBe(true);
    expect(hasPermission(UserRoleValues.VIEWER, Permission.DOCUMENT_READ)).toBe(true);
    expect(hasPermission(UserRoleValues.VIEWER, Permission.PROJECT_DELETE)).toBe(false);
    expect(hasPermission(UserRoleValues.VIEWER, Permission.USER_CREATE)).toBe(false);
  });

  it('ACCOUNTANT should have finance permissions but not all project permissions', () => {
    expect(hasPermission(UserRoleValues.ACCOUNTANT, Permission.BUDGET_MANAGE)).toBe(true);
    expect(hasPermission(UserRoleValues.ACCOUNTANT, Permission.INVOICE_CREATE)).toBe(true);
    expect(hasPermission(UserRoleValues.ACCOUNTANT, Permission.PAYMENT_CREATE)).toBe(true);
    expect(hasPermission(UserRoleValues.ACCOUNTANT, Permission.PROJECT_CREATE)).toBe(false);
  });

  it('HR should have HR permissions but not finance', () => {
    expect(hasPermission(UserRoleValues.HR, Permission.EMPLOYEE_READ)).toBe(true);
    expect(hasPermission(UserRoleValues.HR, Permission.EMPLOYEE_UPDATE)).toBe(true);
    expect(hasPermission(UserRoleValues.HR, Permission.BUDGET_MANAGE)).toBe(false);
  });

  it('unknown role should have no permissions', () => {
    expect(hasPermission('UNKNOWN_ROLE', Permission.PROJECT_READ)).toBe(false);
    expect(hasPermission('UNKNOWN_ROLE', Permission.USER_CREATE)).toBe(false);
  });
});

// ============================================
// Multi-permission Checks
// ============================================

describe('RBAC — hasAnyPermission', () => {
  it('should return true if user has at least one permission', () => {
    expect(hasAnyPermission(UserRoleValues.ENGINEER, [Permission.USER_CREATE, Permission.TASK_CREATE])).toBe(true);
  });

  it('should return false if user has none of the permissions', () => {
    expect(hasAnyPermission(UserRoleValues.VIEWER, [Permission.USER_CREATE, Permission.BUDGET_MANAGE])).toBe(false);
  });

  it('ADMIN should always have any permission', () => {
    expect(hasAnyPermission(UserRoleValues.ADMIN, [Permission.PROJECT_CREATE, Permission.USER_DELETE])).toBe(true);
  });
});

describe('RBAC — hasAllPermissions', () => {
  it('should return true only if user has ALL permissions', () => {
    expect(hasAllPermissions(UserRoleValues.ACCOUNTANT, [
      Permission.INVOICE_CREATE,
      Permission.PAYMENT_READ,
    ])).toBe(true);

    expect(hasAllPermissions(UserRoleValues.ACCOUNTANT, [
      Permission.INVOICE_CREATE,
      Permission.PROJECT_DELETE,
    ])).toBe(false);
  });

  it('ADMIN should have all permissions', () => {
    expect(hasAllPermissions(UserRoleValues.ADMIN, [
      Permission.USER_CREATE,
      Permission.PROJECT_DELETE,
      Permission.BUDGET_MANAGE,
    ])).toBe(true);
  });
});

// ============================================
// Role Hierarchy
// ============================================

describe('RBAC — Role Hierarchy', () => {
  it('ADMIN is above everyone', () => {
    for (const role of Object.values(UserRoleValues)) {
      expect(isRoleAtLeast(UserRoleValues.ADMIN, role)).toBe(true);
    }
  });

  it('VIEWER is below everyone except itself', () => {
    for (const role of Object.values(UserRoleValues)) {
      if (role !== UserRoleValues.VIEWER) {
        expect(isRoleAtLeast(UserRoleValues.VIEWER, role)).toBe(false);
      }
    }
  });

  it('MANAGER is above ENGINEER but below ADMIN', () => {
    expect(isRoleAtLeast(UserRoleValues.MANAGER, UserRoleValues.ENGINEER)).toBe(true);
    expect(isRoleAtLeast(UserRoleValues.MANAGER, UserRoleValues.ADMIN)).toBe(false);
  });

  it('ENGINEER and ACCOUNTANT are at the same level', () => {
    expect(isRoleAtLeast(UserRoleValues.ENGINEER, UserRoleValues.ACCOUNTANT)).toBe(true);
    expect(isRoleAtLeast(UserRoleValues.ACCOUNTANT, UserRoleValues.ENGINEER)).toBe(true);
  });

  it('same role is always at least itself', () => {
    for (const role of Object.values(UserRoleValues)) {
      expect(isRoleAtLeast(role, role)).toBe(true);
    }
  });

  it('unknown role has level 0', () => {
    expect(isRoleAtLeast('UNKNOWN', UserRoleValues.VIEWER)).toBe(false);
    expect(isRoleAtLeast(UserRoleValues.ADMIN, 'UNKNOWN')).toBe(true);
  });
});

// ============================================
// Role Normalization
// ============================================

describe('RBAC — normalizeRole', () => {
  it('should uppercase lowercase roles', () => {
    expect(normalizeRole('admin')).toBe('ADMIN');
    expect(normalizeRole('manager')).toBe('MANAGER');
    expect(normalizeRole('viewer')).toBe('VIEWER');
  });

  it('should keep already uppercase roles', () => {
    expect(normalizeRole('ADMIN')).toBe('ADMIN');
    expect(normalizeRole('MANAGER')).toBe('MANAGER');
  });

  it('should handle PROJECT_MANAGER variants', () => {
    expect(normalizeRole('project_manager')).toBe('PROJECT_MANAGER');
    expect(normalizeRole('PROJECT-MANAGER')).toBe('PROJECT_MANAGER');
    expect(normalizeRole('PROJECTMANAGER')).toBe('PROJECT_MANAGER');
  });
});

// ============================================
// canAccessResource
// ============================================

describe('RBAC — canAccessResource', () => {
  it('ADMIN should access any resource', () => {
    expect(canAccessResource('ADMIN', 'project', 'read')).toBe(true);
    expect(canAccessResource('ADMIN', 'contract', 'create')).toBe(true);
    expect(canAccessResource('ADMIN', 'payment', 'delete')).toBe(true);
    expect(canAccessResource('ADMIN', 'risk', 'write')).toBe(true);
  });

  it('should grant access based on permission mapping', () => {
    // MANAGER has PROJECT_CREATE
    expect(canAccessResource('MANAGER', 'project', 'create')).toBe(true);
    // MANAGER has INVOICE_CREATE
    expect(canAccessResource('MANAGER', 'invoice', 'create')).toBe(true);
    // MANAGER has CONTRACT_READ
    expect(canAccessResource('MANAGER', 'contract', 'read')).toBe(true);
  });

  it('should deny access without permission', () => {
    // VIEWER does not have PROJECT_DELETE
    expect(canAccessResource('VIEWER', 'project', 'delete')).toBe(false);
    // VIEWER does not have INVOICE_CREATE
    expect(canAccessResource('VIEWER', 'invoice', 'create')).toBe(false);
  });

  it('should support all resource types', () => {
    // Test a sample of the newly added resource types
    expect(canAccessResource('MANAGER', 'contract', 'read')).toBe(true);
    expect(canAccessResource('MANAGER', 'bid', 'create')).toBe(true);
    expect(canAccessResource('MANAGER', 'meeting', 'read')).toBe(true);
    expect(canAccessResource('MANAGER', 'defect', 'create')).toBe(true);
    expect(canAccessResource('MANAGER', 'risk', 'read')).toBe(true);
    expect(canAccessResource('MANAGER', 'approval', 'create')).toBe(true);
    expect(canAccessResource('MANAGER', 'proposal', 'read')).toBe(true);
    expect(canAccessResource('MANAGER', 'payment', 'create')).toBe(true);
    expect(canAccessResource('MANAGER', 'budget', 'read')).toBe(true);
    expect(canAccessResource('MANAGER', 'employee', 'read')).toBe(true);
  });

  it('should allow resource owner access', () => {
    expect(canAccessResource('VIEWER', 'project', 'read', 'user-1', 'user-1')).toBe(true);
  });

  it('should return false for unknown resource types', () => {
    expect(canAccessResource('ADMIN', 'nonexistent_resource', 'read')).toBe(true); // ADMIN bypasses
    expect(canAccessResource('VIEWER', 'nonexistent_resource', 'read')).toBe(false);
  });
});

// ============================================
// Helper Functions
// ============================================

describe('RBAC — Helper Functions', () => {
  it('isAdmin should correctly identify admin role', () => {
    expect(isAdmin('ADMIN')).toBe(true);
    expect(isAdmin('admin')).toBe(true);
    expect(isAdmin('MANAGER')).toBe(false);
    expect(isAdmin('VIEWER')).toBe(false);
  });

  it('canManageUsers should work correctly', () => {
    expect(canManageUsers('ADMIN')).toBe(true);
    expect(canManageUsers('MANAGER')).toBe(true); // Has USER_CREATE, UPDATE
    expect(canManageUsers('VIEWER')).toBe(false);
  });

  it('canManageProjects should work correctly', () => {
    expect(canManageProjects('ADMIN')).toBe(true);
    expect(canManageProjects('MANAGER')).toBe(true);
    expect(canManageProjects('VIEWER')).toBe(false);
  });

  it('canAccessFinancials should work correctly', () => {
    expect(canAccessFinancials('ADMIN')).toBe(true);
    expect(canAccessFinancials('ACCOUNTANT')).toBe(true);
    expect(canAccessFinancials('VIEWER')).toBe(false);
  });

  it('canAccessHR should work correctly', () => {
    expect(canAccessHR('ADMIN')).toBe(true);
    expect(canAccessHR('HR')).toBe(true);
    expect(canAccessHR('ACCOUNTANT')).toBe(false);
  });
});

// ============================================
// Protected Paths
// ============================================

describe('RBAC — Protected Paths', () => {
  const ROLE_PROTECTED_PATHS: Record<string, string[]> = {
    '/admin': ['ADMIN'],
    '/settings': ['ADMIN', 'MANAGER'],
    '/reports': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
    '/hr': ['ADMIN', 'MANAGER', 'HR'],
  };

  function getRequiredRoles(pathname: string): string[] | null {
    for (const [path, roles] of Object.entries(ROLE_PROTECTED_PATHS)) {
      if (pathname.startsWith(path)) return roles;
    }
    return null;
  }

  function isAuthorized(pathname: string, userRole: string): boolean {
    const required = getRequiredRoles(pathname);
    if (!required) return true; // Public
    const normalizedRole = normalizeRole(userRole);
    return required.includes(normalizedRole);
  }

  it('/admin should only allow ADMIN', () => {
    expect(isAuthorized('/admin', 'ADMIN')).toBe(true);
    expect(isAuthorized('/admin', 'MANAGER')).toBe(false);
    expect(isAuthorized('/admin', 'VIEWER')).toBe(false);
  });

  it('/settings should allow ADMIN and MANAGER', () => {
    expect(isAuthorized('/settings', 'ADMIN')).toBe(true);
    expect(isAuthorized('/settings', 'MANAGER')).toBe(true);
    expect(isAuthorized('/settings', 'ENGINEER')).toBe(false);
  });

  it('/reports should allow ADMIN, MANAGER, and ACCOUNTANT', () => {
    expect(isAuthorized('/reports', 'ACCOUNTANT')).toBe(true);
    expect(isAuthorized('/reports', 'ENGINEER')).toBe(false);
  });

  it('/hr should allow ADMIN, MANAGER, and HR', () => {
    expect(isAuthorized('/hr', 'HR')).toBe(true);
    expect(isAuthorized('/hr', 'ACCOUNTANT')).toBe(false);
  });

  it('/projects should be accessible to all authenticated users', () => {
    expect(isAuthorized('/projects', 'VIEWER')).toBe(true);
    expect(isAuthorized('/projects', 'ADMIN')).toBe(true);
  });

  it('/admin/users should be admin-only (subpath)', () => {
    expect(isAuthorized('/admin/users', 'ADMIN')).toBe(true);
    expect(isAuthorized('/admin/users', 'MANAGER')).toBe(false);
  });
});
