/**
 * Authorization Module
 * وحدة التحقق من الصلاحيات
 *
 * Handles role-based access control (RBAC) and permission checks.
 * Uses string role values (not Prisma enums) for client-side compatibility.
 */

import { Permission, ROLE_PERMISSIONS, UserRoleValues } from '../types';

// ============================================
// Role Types (client-safe string constants)
// ============================================

export type Role = string;

const ROLE_HIERARCHY: Record<string, number> = {
  [UserRoleValues.ADMIN]: 100,
  [UserRoleValues.MANAGER]: 80,
  [UserRoleValues.PROJECT_MANAGER]: 70,
  [UserRoleValues.ENGINEER]: 50,
  [UserRoleValues.DRAFTSMAN]: 45,
  [UserRoleValues.ACCOUNTANT]: 50,
  [UserRoleValues.HR]: 50,
  [UserRoleValues.SECRETARY]: 40,
  [UserRoleValues.VIEWER]: 25,
};

/**
 * Normalize role to uppercase for lookup
 * Canonical implementation — also used by @/lib/permissions.ts
 */
export function normalizeRole(role: string): string {
  const upper = role.toUpperCase();
  // Map compound roles
  if (upper === 'PROJECT_MANAGER' || upper === 'PROJECT-MANAGER' || upper === 'PROJECTMANAGER') {
    return 'PROJECT_MANAGER';
  }
  return upper;
}

// ============================================
// Permission Checks
// ============================================

/**
 * Check if user has a specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const normalizedRole = normalizeRole(userRole);
  const rolePermissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

// ============================================
// Role Checks
// ============================================

/**
 * Check if user role is at or above a certain level
 */
export function isRoleAtLeast(userRole: Role, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[normalizeRole(userRole)] || ROLE_HIERARCHY[userRole] || 0;
  if (userLevel === 0) return false; // Unknown user role → deny
  const requiredLevel = ROLE_HIERARCHY[normalizeRole(requiredRole)] || ROLE_HIERARCHY[requiredRole] || 0;
  if (requiredLevel === 0) return false; // Unknown required role → fail-closed (deny by default)
  return userLevel >= requiredLevel;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: Role): boolean {
  const r = normalizeRole(userRole);
  return r === 'ADMIN';
}

/**
 * Check if user is manager or above
 */
export function isManagerOrAbove(userRole: Role): boolean {
  return isRoleAtLeast(userRole, UserRoleValues.MANAGER);
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(userRole: Role): boolean {
  return hasAnyPermission(userRole, [
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
  ]);
}

/**
 * Check if user can manage projects
 */
export function canManageProjects(userRole: Role): boolean {
  return hasAnyPermission(userRole, [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
  ]);
}

/**
 * Check if user can approve items
 */
export function canApprove(userRole: Role): boolean {
  return isManagerOrAbove(userRole);
}

/**
 * Check if user can access financial data
 */
export function canAccessFinancials(userRole: Role): boolean {
  return hasAnyPermission(userRole, [
    Permission.INVOICE_CREATE,
    Permission.INVOICE_UPDATE,
    Permission.BUDGET_MANAGE,
  ]);
}

/**
 * Check if user can access HR data
 */
export function canAccessHR(userRole: Role): boolean {
  const r = normalizeRole(userRole);
  return r === 'ADMIN' || r === 'MANAGER' || r === 'HR';
}

// ============================================
// Role Utilities
// ============================================

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS[role] || [];
}

/**
 * Get role level in hierarchy
 */
export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY[normalizeRole(role)] || ROLE_HIERARCHY[role] || 0;
}

/**
 * Get all roles below a certain level
 */
export function getRolesBelow(role: Role): string[] {
  const level = ROLE_HIERARCHY[normalizeRole(role)] || ROLE_HIERARCHY[role] || 0;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, rLevel]) => rLevel < level)
    .map(([r]) => r);
}

/**
 * Get all roles at or above a certain level
 */
export function getRolesAtOrAbove(role: Role): string[] {
  const level = ROLE_HIERARCHY[normalizeRole(role)] || ROLE_HIERARCHY[role] || 0;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, rLevel]) => rLevel >= level)
    .map(([r]) => r);
}

// ============================================
// Resource Access Control
// ============================================

/**
 * Check if user can access a specific resource
 */
export function canAccessResource(
  userRole: Role,
  resourceType: string,
  action: 'read' | 'write' | 'delete' | 'create',
  resourceOwnerId?: string,
  userId?: string
): boolean {
  if (isAdmin(userRole)) return true;

  if (resourceOwnerId && userId && resourceOwnerId === userId) {
    return true;
  }

  // SECURITY: Normalize action to lowercase to prevent silent denials from case mismatch
  // (e.g., passing 'DELETE' instead of 'delete' would return undefined without this)
  const normalizedAction = action.toLowerCase() as 'read' | 'write' | 'delete' | 'create';

  const permissionMap: Record<string, Record<string, Permission>> = {
    project: {
      read: Permission.PROJECT_READ,
      write: Permission.PROJECT_UPDATE,
      delete: Permission.PROJECT_DELETE,
      create: Permission.PROJECT_CREATE,
    },
    client: {
      read: Permission.CLIENT_READ,
      write: Permission.CLIENT_UPDATE,
      delete: Permission.CLIENT_DELETE,
      create: Permission.CLIENT_CREATE,
    },
    task: {
      read: Permission.TASK_READ,
      write: Permission.TASK_UPDATE,
      delete: Permission.TASK_DELETE,
      create: Permission.TASK_CREATE,
    },
    invoice: {
      read: Permission.INVOICE_READ,
      write: Permission.INVOICE_UPDATE,
      delete: Permission.INVOICE_DELETE,
      create: Permission.INVOICE_CREATE,
    },
    user: {
      read: Permission.USER_READ,
      write: Permission.USER_UPDATE,
      delete: Permission.USER_DELETE,
      create: Permission.USER_CREATE,
    },
    document: {
      read: Permission.DOCUMENT_READ,
      write: Permission.DOCUMENT_UPDATE,
      delete: Permission.DOCUMENT_DELETE,
      create: Permission.DOCUMENT_CREATE,
    },
    notification: {
      read: Permission.NOTIFICATION_READ,
      write: Permission.NOTIFICATION_UPDATE,
      delete: Permission.NOTIFICATION_DELETE,
      create: Permission.NOTIFICATION_UPDATE, // Notifications are auto-generated; update is closest
    },
    search: {
      read: Permission.SEARCH_READ,
      write: Permission.SEARCH_READ, // Search is read-only; same permission for both
      delete: Permission.SEARCH_READ,
      create: Permission.SEARCH_READ, // Search is read-only
    },
    contract: {
      read: Permission.CONTRACT_READ,
      write: Permission.CONTRACT_UPDATE,
      delete: Permission.CONTRACT_DELETE,
      create: Permission.CONTRACT_CREATE,
    },
    contractor: {
      read: Permission.CONTRACTOR_READ,
      write: Permission.CONTRACTOR_UPDATE,
      delete: Permission.CONTRACTOR_DELETE,
      create: Permission.CONTRACTOR_CREATE,
    },
    bid: {
      read: Permission.BID_READ,
      write: Permission.BID_UPDATE,
      delete: Permission.BID_DELETE,
      create: Permission.BID_CREATE,
    },
    meeting: {
      read: Permission.MEETING_READ,
      write: Permission.MEETING_UPDATE,
      delete: Permission.MEETING_DELETE,
      create: Permission.MEETING_CREATE,
    },
    site_diary: {
      read: Permission.SITE_DIARY_READ,
      write: Permission.SITE_DIARY_UPDATE,
      delete: Permission.SITE_DIARY_DELETE,
      create: Permission.SITE_DIARY_CREATE,
    },
    violation: {
      read: Permission.VIOLATION_READ,
      write: Permission.VIOLATION_UPDATE,
      delete: Permission.VIOLATION_DELETE,
      create: Permission.VIOLATION_CREATE,
    },
    submittal: {
      read: Permission.SUBMITTAL_READ,
      write: Permission.SUBMITTAL_UPDATE,
      delete: Permission.SUBMITTAL_DELETE,
      create: Permission.SUBMITTAL_CREATE,
    },
    inspection: {
      read: Permission.INSPECTION_READ,
      write: Permission.INSPECTION_UPDATE,
      delete: Permission.INSPECTION_DELETE,
      create: Permission.INSPECTION_CREATE,
    },
    supplier: {
      read: Permission.SUPPLIER_READ,
      write: Permission.SUPPLIER_UPDATE,
      delete: Permission.SUPPLIER_DELETE,
      create: Permission.SUPPLIER_CREATE,
    },
    change_order: {
      read: Permission.CHANGE_ORDER_READ,
      write: Permission.CHANGE_ORDER_UPDATE,
      delete: Permission.CHANGE_ORDER_DELETE,
      create: Permission.CHANGE_ORDER_CREATE,
    },
    approval: {
      read: Permission.APPROVAL_READ,
      write: Permission.APPROVAL_UPDATE,
      delete: Permission.APPROVAL_DELETE,
      create: Permission.APPROVAL_CREATE,
    },
    proposal: {
      read: Permission.PROPOSAL_READ,
      write: Permission.PROPOSAL_UPDATE,
      delete: Permission.PROPOSAL_DELETE,
      create: Permission.PROPOSAL_CREATE,
    },
    commission: {
      read: Permission.COMMISSION_READ,
      write: Permission.COMMISSION_UPDATE,
      delete: Permission.COMMISSION_DELETE,
      create: Permission.COMMISSION_CREATE,
    },
    payment: {
      read: Permission.PAYMENT_READ,
      write: Permission.PAYMENT_UPDATE,
      delete: Permission.PAYMENT_DELETE,
      create: Permission.PAYMENT_CREATE,
    },
    purchase_order: {
      read: Permission.PURCHASE_ORDER_READ,
      write: Permission.PURCHASE_ORDER_UPDATE,
      delete: Permission.PURCHASE_ORDER_DELETE,
      create: Permission.PURCHASE_ORDER_CREATE,
    },
    inventory: {
      read: Permission.INVENTORY_READ,
      write: Permission.INVENTORY_UPDATE,
      delete: Permission.INVENTORY_DELETE,
      create: Permission.INVENTORY_CREATE,
    },
    defect: {
      read: Permission.DEFECT_READ,
      write: Permission.DEFECT_UPDATE,
      delete: Permission.DEFECT_DELETE,
      create: Permission.DEFECT_CREATE,
    },
    risk: {
      read: Permission.RISK_READ,
      write: Permission.RISK_UPDATE,
      delete: Permission.RISK_DELETE,
      create: Permission.RISK_CREATE,
    },
    employee: {
      read: Permission.EMPLOYEE_READ,
      write: Permission.EMPLOYEE_UPDATE,
      delete: Permission.EMPLOYEE_DELETE,
      create: Permission.USER_CREATE, // Use USER_CREATE instead of EMPLOYEE_READ
    },
    budget: {
      read: Permission.BUDGET_MANAGE,  // Only BUDGET_MANAGE exists
      write: Permission.BUDGET_MANAGE,
      delete: Permission.BUDGET_MANAGE,
      create: Permission.BUDGET_MANAGE,
    },
    settings: {
      read: Permission.SETTINGS_READ,
      write: Permission.SETTINGS_UPDATE,
      delete: Permission.SETTINGS_UPDATE, // No SETTINGS_DELETE
      create: Permission.SETTINGS_UPDATE,
    },
    reports: {
      read: Permission.REPORTS_READ,
      write: Permission.REPORTS_EXPORT,
      delete: Permission.REPORTS_READ, // No delete for reports
      create: Permission.REPORTS_EXPORT,
    },
  };

  const resourcePermissions = permissionMap[resourceType.toLowerCase()];
  if (!resourcePermissions) return false;

  const requiredPermission = resourcePermissions[normalizedAction];
  if (!requiredPermission) return false;

  return hasPermission(userRole, requiredPermission);
}

// ============================================
// Organization Access
// ============================================

/**
 * Check if user belongs to the same organization as a resource
 */
export function isSameOrganization(
  userOrgId: string | undefined,
  resourceOrgId: string | undefined
): boolean {
  if (!userOrgId || !resourceOrgId) return false;
  return userOrgId === resourceOrgId;
}

/**
 * Check if user can access organization data
 */
export function canAccessOrganization(
  userRole: Role,
  userOrgId: string | undefined,
  resourceOrgId: string | undefined
): boolean {
  if (!isSameOrganization(userOrgId, resourceOrgId)) {
    return false;
  }
  return true;
}
