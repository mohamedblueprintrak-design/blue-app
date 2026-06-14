/**
 * Tests for Authorization Module
 * Covers: normalizeRole, hasPermission, hasAnyPermission, hasAllPermissions,
 * isRoleAtLeast, isAdmin, isManagerOrAbove, canManageUsers, canManageProjects,
 * canApprove, canAccessFinancials, canAccessHR, getRolePermissions, getRoleLevel,
 * getRolesBelow, getRolesAtOrAbove, canAccessResource, isSameOrganization,
 * canAccessOrganization
 */

import { describe, it, expect } from '@jest/globals';

import { Permission } from '@/lib/auth/types';

import {
  normalizeRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isRoleAtLeast,
  isAdmin,
  isManagerOrAbove,
  canManageUsers,
  canManageProjects,
  canApprove,
  canAccessFinancials,
  canAccessHR,
  getRolePermissions,
  getRoleLevel,
  getRolesBelow,
  getRolesAtOrAbove,
  canAccessResource,
  isSameOrganization,
  canAccessOrganization,
} from '@/lib/auth/modules/authorization';

// ═══════════════════════════════════════════════════════════════════════
// 1. normalizeRole
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — normalizeRole', () => {
  it('should convert to uppercase', () => {
    expect(normalizeRole('admin')).toBe('ADMIN');
  });

  it('should handle PROJECT_MANAGER variants', () => {
    expect(normalizeRole('project_manager')).toBe('PROJECT_MANAGER');
    expect(normalizeRole('PROJECT-MANAGER')).toBe('PROJECT_MANAGER');
    expect(normalizeRole('PROJECTMANAGER')).toBe('PROJECT_MANAGER');
    expect(normalizeRole('project-manager')).toBe('PROJECT_MANAGER');
  });

  it('should leave standard roles unchanged (after uppercase)', () => {
    expect(normalizeRole('ENGINEER')).toBe('ENGINEER');
    expect(normalizeRole('MANAGER')).toBe('MANAGER');
    expect(normalizeRole('VIEWER')).toBe('VIEWER');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. hasPermission
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — hasPermission', () => {
  it('ADMIN should have all permissions', () => {
    expect(hasPermission('ADMIN', Permission.PROJECT_CREATE)).toBe(true);
    expect(hasPermission('ADMIN', Permission.INVOICE_CREATE)).toBe(true);
    expect(hasPermission('ADMIN', Permission.USER_CREATE)).toBe(true);
  });

  it('VIEWER should have read permissions', () => {
    expect(hasPermission('VIEWER', Permission.PROJECT_READ)).toBe(true);
  });

  it('VIEWER should not have create permissions', () => {
    expect(hasPermission('VIEWER', Permission.PROJECT_CREATE)).toBe(false);
  });

  it('should handle lowercase role', () => {
    expect(hasPermission('admin', Permission.PROJECT_CREATE)).toBe(true);
  });

  it('should return false for unknown role', () => {
    expect(hasPermission('UNKNOWN_ROLE', Permission.PROJECT_READ)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. hasAnyPermission
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — hasAnyPermission', () => {
  it('should return true when user has at least one permission', () => {
    expect(hasAnyPermission('ADMIN', [Permission.PROJECT_CREATE, Permission.INVOICE_CREATE])).toBe(true);
  });

  it('should return false when user has none of the permissions', () => {
    expect(hasAnyPermission('VIEWER', [Permission.PROJECT_CREATE, Permission.INVOICE_CREATE])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. hasAllPermissions
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — hasAllPermissions', () => {
  it('should return true when user has all permissions', () => {
    expect(hasAllPermissions('ADMIN', [Permission.PROJECT_READ, Permission.PROJECT_CREATE])).toBe(true);
  });

  it('should return false when user is missing some permissions', () => {
    expect(hasAllPermissions('VIEWER', [Permission.PROJECT_READ, Permission.PROJECT_CREATE])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. isRoleAtLeast
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — isRoleAtLeast', () => {
  it('ADMIN should be at least MANAGER', () => {
    expect(isRoleAtLeast('ADMIN', 'MANAGER')).toBe(true);
  });

  it('ENGINEER should not be at least MANAGER', () => {
    expect(isRoleAtLeast('ENGINEER', 'MANAGER')).toBe(false);
  });

  it('same role should satisfy isRoleAtLeast', () => {
    expect(isRoleAtLeast('MANAGER', 'MANAGER')).toBe(true);
  });

  it('should return false for unknown roles', () => {
    expect(isRoleAtLeast('UNKNOWN', 'MANAGER')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. isAdmin / isManagerOrAbove
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — isAdmin', () => {
  it('should return true for ADMIN', () => {
    expect(isAdmin('ADMIN')).toBe(true);
  });

  it('should return true for lowercase admin', () => {
    expect(isAdmin('admin')).toBe(true);
  });

  it('should return false for non-admin', () => {
    expect(isAdmin('MANAGER')).toBe(false);
  });
});

describe('Authorization — isManagerOrAbove', () => {
  it('should return true for ADMIN', () => {
    expect(isManagerOrAbove('ADMIN')).toBe(true);
  });

  it('should return true for MANAGER', () => {
    expect(isManagerOrAbove('MANAGER')).toBe(true);
  });

  it('should return false for ENGINEER', () => {
    expect(isManagerOrAbove('ENGINEER')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. canManageUsers / canManageProjects / canApprove
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — canManageUsers', () => {
  it('ADMIN can manage users', () => {
    expect(canManageUsers('ADMIN')).toBe(true);
  });

  it('VIEWER cannot manage users', () => {
    expect(canManageUsers('VIEWER')).toBe(false);
  });
});

describe('Authorization — canManageProjects', () => {
  it('ADMIN can manage projects', () => {
    expect(canManageProjects('ADMIN')).toBe(true);
  });

  it('VIEWER cannot manage projects', () => {
    expect(canManageProjects('VIEWER')).toBe(false);
  });
});

describe('Authorization — canApprove', () => {
  it('ADMIN can approve', () => {
    expect(canApprove('ADMIN')).toBe(true);
  });

  it('MANAGER can approve', () => {
    expect(canApprove('MANAGER')).toBe(true);
  });

  it('ENGINEER cannot approve', () => {
    expect(canApprove('ENGINEER')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. canAccessFinancials / canAccessHR
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — canAccessFinancials', () => {
  it('ADMIN can access financials', () => {
    expect(canAccessFinancials('ADMIN')).toBe(true);
  });

  it('VIEWER cannot access financials', () => {
    expect(canAccessFinancials('VIEWER')).toBe(false);
  });
});

describe('Authorization — canAccessHR', () => {
  it('ADMIN can access HR', () => {
    expect(canAccessHR('ADMIN')).toBe(true);
  });

  it('HR can access HR', () => {
    expect(canAccessHR('HR')).toBe(true);
  });

  it('MANAGER can access HR', () => {
    expect(canAccessHR('MANAGER')).toBe(true);
  });

  it('ENGINEER cannot access HR', () => {
    expect(canAccessHR('ENGINEER')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. getRolePermissions / getRoleLevel
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — getRolePermissions', () => {
  it('should return permissions for ADMIN', () => {
    const perms = getRolePermissions('ADMIN');
    expect(perms.length).toBeGreaterThan(0);
  });

  it('should return empty array for unknown role', () => {
    const perms = getRolePermissions('NONEXISTENT');
    expect(perms).toEqual([]);
  });
});

describe('Authorization — getRoleLevel', () => {
  it('should return 100 for ADMIN', () => {
    expect(getRoleLevel('ADMIN')).toBe(100);
  });

  it('should return 25 for VIEWER', () => {
    expect(getRoleLevel('VIEWER')).toBe(25);
  });

  it('should return 0 for unknown role', () => {
    expect(getRoleLevel('NONEXISTENT')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. getRolesBelow / getRolesAtOrAbove
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — getRolesBelow', () => {
  it('should return roles below MANAGER', () => {
    const below = getRolesBelow('MANAGER');
    expect(below).not.toContain('ADMIN');
    expect(below).not.toContain('MANAGER');
    expect(below).toContain('ENGINEER');
    expect(below).toContain('VIEWER');
  });
});

describe('Authorization — getRolesAtOrAbove', () => {
  it('should return roles at or above MANAGER', () => {
    const above = getRolesAtOrAbove('MANAGER');
    expect(above).toContain('ADMIN');
    expect(above).toContain('MANAGER');
    expect(above).not.toContain('ENGINEER');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. canAccessResource
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — canAccessResource', () => {
  it('ADMIN can access any resource', () => {
    expect(canAccessResource('ADMIN', 'project', 'read')).toBe(true);
    expect(canAccessResource('ADMIN', 'invoice', 'create')).toBe(true);
  });

  it('owner can always access their own resource', () => {
    expect(canAccessResource('ENGINEER', 'task', 'read', 'user-1', 'user-1')).toBe(true);
  });

  it('should deny unknown resource types', () => {
    expect(canAccessResource('ENGINEER', 'unknown_resource', 'read')).toBe(false);
  });

  it('should handle uppercase action names', () => {
    expect(canAccessResource('ADMIN', 'project', 'READ' as never)).toBe(true);
  });

  it('should check various resource types with ADMIN', () => {
    expect(canAccessResource('ADMIN', 'project', 'create')).toBe(true);
    expect(canAccessResource('ADMIN', 'invoice', 'read')).toBe(true);
    expect(canAccessResource('ADMIN', 'task', 'update')).toBe(true);
    expect(canAccessResource('ADMIN', 'user', 'delete')).toBe(true);
    expect(canAccessResource('ADMIN', 'document', 'create')).toBe(true);
    expect(canAccessResource('ADMIN', 'contract', 'read')).toBe(true);
    expect(canAccessResource('ADMIN', 'budget', 'read')).toBe(true);
    expect(canAccessResource('ADMIN', 'settings', 'update')).toBe(true);
    expect(canAccessResource('ADMIN', 'reports', 'read')).toBe(true);
  });

  it('VIEWER should have limited resource access', () => {
    expect(canAccessResource('VIEWER', 'project', 'read')).toBe(true);
    expect(canAccessResource('VIEWER', 'project', 'create')).toBe(false);
    expect(canAccessResource('VIEWER', 'invoice', 'create')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12. isSameOrganization / canAccessOrganization
// ═══════════════════════════════════════════════════════════════════════

describe('Authorization — isSameOrganization', () => {
  it('should return true for same org ID', () => {
    expect(isSameOrganization('org-1', 'org-1')).toBe(true);
  });

  it('should return false for different org IDs', () => {
    expect(isSameOrganization('org-1', 'org-2')).toBe(false);
  });

  it('should return false when either org ID is undefined', () => {
    expect(isSameOrganization(undefined, 'org-1')).toBe(false);
    expect(isSameOrganization('org-1', undefined)).toBe(false);
  });
});

describe('Authorization — canAccessOrganization', () => {
  it('should return true for same organization', () => {
    expect(canAccessOrganization('ADMIN', 'org-1', 'org-1')).toBe(true);
  });

  it('should return false for different organization', () => {
    expect(canAccessOrganization('ADMIN', 'org-1', 'org-2')).toBe(false);
  });
});
