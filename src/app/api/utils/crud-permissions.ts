/**
 * CRUD Permission Enforcement Middleware
 * وسيط فرض صلاحيات مستوى CRUD
 *
 * Automatically maps HTTP methods to CRUD permissions for API routes.
 * Ensures that every write operation (POST, PUT, PATCH, DELETE) is
 * properly authorized with the corresponding permission level.
 *
 * USAGE:
 *   import { withCrudPermissions } from '../utils/crud-permissions';
 *
 *   export const GET = withCrudPermissions('task', async (request, ctx) => {
 *     // Read logic - automatically checks TASK_READ
 *   });
 *
 *   export const POST = withCrudPermissions('task', async (request, ctx) => {
 *     // Create logic - automatically checks TASK_CREATE
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireAuthContext, AuthContext, orgFilter, orgCreate } from './auth';
import { Permission } from '@/lib/auth/types';
import { hasPermission } from '@/lib/auth/modules/authorization';
import { forbiddenResponse, unauthorizedResponse } from './response';
import { log } from '@/lib/logger';

// ============================================
// Resource-to-Permission Mapping
// ============================================

/**
 * Maps resource names to their CRUD permission enums.
 * Each resource maps to { create, read, update, delete } Permission values.
 */
const RESOURCE_PERMISSIONS: Record<string, {
  create?: Permission;
  read?: Permission;
  update?: Permission;
  delete?: Permission;
}> = {
  project: {
    create: Permission.PROJECT_CREATE,
    read: Permission.PROJECT_READ,
    update: Permission.PROJECT_UPDATE,
    delete: Permission.PROJECT_DELETE,
  },
  task: {
    create: Permission.TASK_CREATE,
    read: Permission.TASK_READ,
    update: Permission.TASK_UPDATE,
    delete: Permission.TASK_DELETE,
  },
  client: {
    create: Permission.CLIENT_CREATE,
    read: Permission.CLIENT_READ,
    update: Permission.CLIENT_UPDATE,
    delete: Permission.CLIENT_DELETE,
  },
  invoice: {
    create: Permission.INVOICE_CREATE,
    read: Permission.INVOICE_READ,
    update: Permission.INVOICE_UPDATE,
    delete: Permission.INVOICE_DELETE,
  },
  user: {
    create: Permission.USER_CREATE,
    read: Permission.USER_READ,
    update: Permission.USER_UPDATE,
    delete: Permission.USER_DELETE,
  },
  document: {
    create: Permission.DOCUMENT_CREATE,
    read: Permission.DOCUMENT_READ,
    update: Permission.DOCUMENT_UPDATE,
    delete: Permission.DOCUMENT_DELETE,
  },
  contract: {
    create: Permission.CONTRACT_CREATE,
    read: Permission.CONTRACT_READ,
    update: Permission.CONTRACT_UPDATE,
    delete: Permission.CONTRACT_DELETE,
  },
  contractor: {
    create: Permission.CONTRACTOR_CREATE,
    read: Permission.CONTRACTOR_READ,
    update: Permission.CONTRACTOR_UPDATE,
    delete: Permission.CONTRACTOR_DELETE,
  },
  bid: {
    create: Permission.BID_CREATE,
    read: Permission.BID_READ,
    update: Permission.BID_UPDATE,
    delete: Permission.BID_DELETE,
  },
  meeting: {
    create: Permission.MEETING_CREATE,
    read: Permission.MEETING_READ,
    update: Permission.MEETING_UPDATE,
    delete: Permission.MEETING_DELETE,
  },
  site_diary: {
    create: Permission.SITE_DIARY_CREATE,
    read: Permission.SITE_DIARY_READ,
    update: Permission.SITE_DIARY_UPDATE,
    delete: Permission.SITE_DIARY_DELETE,
  },
  violation: {
    create: Permission.VIOLATION_CREATE,
    read: Permission.VIOLATION_READ,
    update: Permission.VIOLATION_UPDATE,
    delete: Permission.VIOLATION_DELETE,
  },
  submittal: {
    create: Permission.SUBMITTAL_CREATE,
    read: Permission.SUBMITTAL_READ,
    update: Permission.SUBMITTAL_UPDATE,
    delete: Permission.SUBMITTAL_DELETE,
  },
  inspection: {
    create: Permission.INSPECTION_CREATE,
    read: Permission.INSPECTION_READ,
    update: Permission.INSPECTION_UPDATE,
    delete: Permission.INSPECTION_DELETE,
  },
  supplier: {
    create: Permission.SUPPLIER_CREATE,
    read: Permission.SUPPLIER_READ,
    update: Permission.SUPPLIER_UPDATE,
    delete: Permission.SUPPLIER_DELETE,
  },
  change_order: {
    create: Permission.CHANGE_ORDER_CREATE,
    read: Permission.CHANGE_ORDER_READ,
    update: Permission.CHANGE_ORDER_UPDATE,
    delete: Permission.CHANGE_ORDER_DELETE,
  },
  approval: {
    create: Permission.APPROVAL_CREATE,
    read: Permission.APPROVAL_READ,
    update: Permission.APPROVAL_UPDATE,
    delete: Permission.APPROVAL_DELETE,
  },
  proposal: {
    create: Permission.PROPOSAL_CREATE,
    read: Permission.PROPOSAL_READ,
    update: Permission.PROPOSAL_UPDATE,
    delete: Permission.PROPOSAL_DELETE,
  },
  commission: {
    create: Permission.COMMISSION_CREATE,
    read: Permission.COMMISSION_READ,
    update: Permission.COMMISSION_UPDATE,
    delete: Permission.COMMISSION_DELETE,
  },
  payment: {
    create: Permission.PAYMENT_CREATE,
    read: Permission.PAYMENT_READ,
    update: Permission.PAYMENT_UPDATE,
    delete: Permission.PAYMENT_DELETE,
  },
  purchase_order: {
    create: Permission.PURCHASE_ORDER_CREATE,
    read: Permission.PURCHASE_ORDER_READ,
    update: Permission.PURCHASE_ORDER_UPDATE,
    delete: Permission.PURCHASE_ORDER_DELETE,
  },
  inventory: {
    create: Permission.INVENTORY_CREATE,
    read: Permission.INVENTORY_READ,
    update: Permission.INVENTORY_UPDATE,
    delete: Permission.INVENTORY_DELETE,
  },
  defect: {
    create: Permission.DEFECT_CREATE,
    read: Permission.DEFECT_READ,
    update: Permission.DEFECT_UPDATE,
    delete: Permission.DEFECT_DELETE,
  },
  risk: {
    create: Permission.RISK_CREATE,
    read: Permission.RISK_READ,
    update: Permission.RISK_UPDATE,
    delete: Permission.RISK_DELETE,
  },
  employee: {
    read: Permission.EMPLOYEE_READ,
    update: Permission.EMPLOYEE_UPDATE,
    delete: Permission.EMPLOYEE_DELETE,
  },
  // Resources that use closest matching permissions
  leave: {
    create: Permission.EMPLOYEE_UPDATE, // HR/Manager creates leave records
    read: Permission.EMPLOYEE_READ,
    update: Permission.EMPLOYEE_UPDATE,
    delete: Permission.EMPLOYEE_DELETE,
  },
  attendance: {
    create: Permission.EMPLOYEE_UPDATE,
    read: Permission.EMPLOYEE_READ,
    update: Permission.EMPLOYEE_UPDATE,
    delete: Permission.EMPLOYEE_DELETE,
  },
  timesheet: {
    create: Permission.EMPLOYEE_UPDATE,
    read: Permission.EMPLOYEE_READ,
    update: Permission.EMPLOYEE_UPDATE,
    delete: Permission.EMPLOYEE_DELETE,
  },
  rfi: {
    create: Permission.SUBMITTAL_CREATE, // RFI is similar to submittal
    read: Permission.SUBMITTAL_READ,
    update: Permission.SUBMITTAL_UPDATE,
    delete: Permission.SUBMITTAL_DELETE,
  },
  tender: {
    create: Permission.PROJECT_CREATE, // Tender creation = project-level
    read: Permission.PROJECT_READ,
    update: Permission.PROJECT_UPDATE,
    delete: Permission.PROJECT_DELETE,
  },
  boq: {
    create: Permission.BUDGET_MANAGE,
    read: Permission.PROJECT_READ,
    update: Permission.BUDGET_MANAGE,
    delete: Permission.BUDGET_MANAGE,
  },
  budget: {
    create: Permission.BUDGET_MANAGE,
    read: Permission.PROJECT_READ,
    update: Permission.BUDGET_MANAGE,
    delete: Permission.BUDGET_MANAGE,
  },
  equipment: {
    create: Permission.INVENTORY_CREATE,
    read: Permission.INVENTORY_READ,
    update: Permission.INVENTORY_UPDATE,
    delete: Permission.INVENTORY_DELETE,
  },
  automation: {
    create: Permission.SETTINGS_UPDATE,
    read: Permission.SETTINGS_READ,
    update: Permission.SETTINGS_UPDATE,
    delete: Permission.SETTINGS_UPDATE,
  },
  design_phase: {
    create: Permission.PROJECT_CREATE,
    read: Permission.PROJECT_READ,
    update: Permission.PROJECT_UPDATE,
    delete: Permission.PROJECT_DELETE,
  },
  workflow_template: {
    create: Permission.SETTINGS_UPDATE,
    read: Permission.SETTINGS_READ,
    update: Permission.SETTINGS_UPDATE,
    delete: Permission.SETTINGS_UPDATE,
  },
  municipality_correspondence: {
    create: Permission.PROJECT_CREATE,
    read: Permission.PROJECT_READ,
    update: Permission.PROJECT_UPDATE,
    delete: Permission.PROJECT_DELETE,
  },
  marketing_campaign: {
    create: Permission.CLIENT_CREATE,
    read: Permission.CLIENT_READ,
    update: Permission.CLIENT_UPDATE,
    delete: Permission.CLIENT_DELETE,
  },
  settings: {
    read: Permission.SETTINGS_READ,
    update: Permission.SETTINGS_UPDATE,
  },
  report: {
    read: Permission.REPORTS_READ,
  },
  dashboard: {
    read: Permission.PROJECT_READ,
  },
};

// ============================================
// HTTP Method to Action Mapping
// ============================================

type CrudAction = 'create' | 'read' | 'update' | 'delete';

const METHOD_ACTION_MAP: Record<string, CrudAction> = {
  GET: 'read',
  HEAD: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

// ============================================
// Permission Check Function
// ============================================

/**
 * Get the required permission for a resource and action.
 * Returns null if no permission mapping exists for the resource.
 */
export function getRequiredPermission(
  resource: string,
  action: CrudAction
): Permission | null {
  const mapping = RESOURCE_PERMISSIONS[resource.toLowerCase()];
  if (!mapping) return null;
  return mapping[action] || null;
}

/**
 * Get the required permission for an HTTP method on a resource.
 */
export function getRequiredPermissionForMethod(
  resource: string,
  method: string
): Permission | null {
  const action = METHOD_ACTION_MAP[method.toUpperCase()];
  if (!action) return null;
  return getRequiredPermission(resource, action);
}

/**
 * Check if a user has the required permission for a resource action.
 * Returns true if the user has permission or if no mapping exists (open access).
 */
export function checkCrudPermission(
  userRole: string,
  resource: string,
  action: CrudAction
): boolean {
  const permission = getRequiredPermission(resource, action);
  if (!permission) {
    // SECURITY: Default deny — no mapping exists, deny access and log warning
    log.warn('No CRUD permission mapping found', { resource, action });
    return false;
  }
  return hasPermission(userRole, permission);
}

// ============================================
// Route Handler Wrapper
// ============================================

/**
 * Extended auth context with CRUD permission information.
 */
export interface CrudAuthContext extends AuthContext {
  /** The resource being accessed */
  resource: string;
  /** The CRUD action being performed */
  action: CrudAction;
  /** The permission that was checked */
  permission: Permission | null;
}

/**
 * Wrap an API route handler with automatic CRUD permission enforcement.
 *
 * USAGE:
 *   export const POST = withCrudPermissions('task', async (request, ctx) => {
 *     // ctx has full AuthContext + resource/action/permission info
 *     const data = await db.task.create({ data: { ...body, ...orgCreate(ctx) } });
 *     return NextResponse.json(data);
 *   });
 *
 * The wrapper automatically:
 * 1. Authenticates the user
 * 2. Maps the HTTP method to a CRUD action
 * 3. Checks the corresponding permission
 * 4. Adds organization filtering context
 * 5. Returns 401/403 if unauthorized
 */
export function withCrudPermissions(
  resource: string,
  handler: (request: NextRequest, ctx: CrudAuthContext) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Step 1: Authenticate
    const authResult = requireAuthContext(request);
    if ('error' in authResult) return authResult.error;

    const user = authResult.user;

    // Step 2: Determine action from HTTP method
    const action = METHOD_ACTION_MAP[request.method.toUpperCase()];
    if (!action) {
      // Unknown method - allow (will be handled by Next.js routing)
      return handler(request, {
        ...user,
        resource,
        action: 'read',
        permission: null,
      });
    }

    // Step 3: Check permission
    const permission = getRequiredPermission(resource, action);
    if (permission && !hasPermission(user.role, permission)) {
      return forbiddenResponse(
        `Insufficient permissions: ${permission} required for ${action} on ${resource}`
      );
    }

    // Step 4: Execute handler with extended context
    return handler(request, {
      ...user,
      resource,
      action,
      permission,
    });
  };
}

/**
 * Check CRUD permission and return auth context or error response.
 * Use this in routes that already have their own handler logic but need
 * permission enforcement.
 *
 * USAGE:
 *   export async function POST(request: NextRequest) {
 *     const result = requireCrudPermission(request, 'task', 'create');
 *     if ('error' in result) return result.error;
 *     const ctx = result.user;
 *     // ... proceed with create logic
 *   }
 */
export function requireCrudPermission(
  request: NextRequest,
  resource: string,
  action: CrudAction
): { user: AuthContext; permission: Permission | null } | { error: NextResponse } {
  const authResult = requireAuthContext(request);
  if ('error' in authResult) return authResult;

  const permission = getRequiredPermission(resource, action);
  if (permission && !hasPermission(authResult.user.role, permission)) {
    return { error: forbiddenResponse(
      `Insufficient permissions: ${permission} required for ${action} on ${resource}`
    )};
  }

  return { user: authResult.user, permission };
}

/**
 * Require CRUD permission based on HTTP method.
 * Automatically determines the action from the request method.
 *
 * USAGE:
 *   export async function POST(request: NextRequest) {
 *     const result = requireMethodPermission(request, 'task');
 *     if ('error' in result) return result.error;
 *     // ... proceed with logic
 *   }
 */
export function requireMethodPermission(
  request: NextRequest,
  resource: string
): { user: AuthContext; action: CrudAction; permission: Permission | null } | { error: NextResponse } {
  const action = METHOD_ACTION_MAP[request.method.toUpperCase()] || 'read';
  const result = requireCrudPermission(request, resource, action);
  if ('error' in result) return result;
  return { user: result.user, action, permission: result.permission };
}

// Re-export commonly used helpers
export { orgFilter, orgCreate };
