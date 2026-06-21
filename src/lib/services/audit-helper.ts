/**
 * Audit Helper — Create ActivityLog entries with old/new value diffing
 *
 * This helper automatically computes a diff between old and new values,
 * storing only the changed fields to keep the data compact.
 *
 * Usage:
 *   await createAuditEntry({
 *     action: 'update',
 *     entityType: 'invoice',
 *     entityId: invoice.id,
 *     userId: ctx.userId,
 *     organizationId: ctx.organizationId,
 *     oldValues: { status: 'draft', total: 100 },
 *     newValues: { status: 'sent', total: 150 },
 *   });
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreateAuditEntryParams {
  /** The action performed: create, update, delete, approve, reject, etc. */
  action: string;
  /** The type of entity: invoice, task, project, etc. */
  entityType: string;
  /** The ID of the affected entity */
  entityId: string;
  /** The user performing the action */
  userId: string;
  /** Optional: project context */
  projectId?: string;
  /** Optional: organization for multi-tenant scoping */
  organizationId?: string | null;
  /** Optional: previous field values (before the change) */
  oldValues?: Record<string, unknown> | null;
  /** Optional: new field values (after the change) */
  newValues?: Record<string, unknown> | null;
  /** Optional: human-readable description of the change */
  details?: string;
}

// ── Diff computation ───────────────────────────────────────────────────────

/**
 * Compute a compact diff between old and new values.
 * Only includes fields that actually changed.
 * Returns { oldValues, newValues } with only the changed keys.
 */
function computeDiff(
  oldVals: Record<string, unknown> | null | undefined,
  newVals: Record<string, unknown> | null | undefined
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } {
  const diffOld: Record<string, unknown> = {};
  const diffNew: Record<string, unknown> = {};

  if (!oldVals && !newVals) {
    return { oldValues: diffOld, newValues: diffNew };
  }

  // Collect all keys from both objects
  const allKeys = new Set<string>([
    ...Object.keys(oldVals ?? {}),
    ...Object.keys(newVals ?? {}),
  ]);

  for (const key of allKeys) {
    const oldVal = oldVals?.[key];
    const newVal = newVals?.[key];

    // Compare values (handle undefined vs missing, null, and deep equality)
    if (!valuesEqual(oldVal, newVal)) {
      if (oldVal !== undefined) diffOld[key] = oldVal;
      if (newVal !== undefined) diffNew[key] = newVal;
    }
  }

  return { oldValues: diffOld, newValues: diffNew };
}

/**
 * Simple deep equality check for primitive values, dates, and shallow objects/arrays.
 * For complex nested objects, JSON serialization comparison is used as fallback.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  // Fast path: same reference or primitive equality
  if (a === b) return true;

  // Both null/undefined
  if (a == null && b == null) return true;

  // One is null/undefined but the other isn't
  if (a == null || b == null) return false;

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Decimal/stringified number comparison (Prisma Decimal returns string)
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Generate a human-readable details string from the diff.
 * Example: "status: draft → sent, total: 100 → 150"
 */
function generateDetailsFromDiff(
  diffOld: Record<string, unknown>,
  diffNew: Record<string, unknown>,
  action: string
): string {
  if (action === 'create') return 'Record created';
  if (action === 'delete') return 'Record deleted';

  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(diffOld), ...Object.keys(diffNew)]);

  for (const key of allKeys) {
    const oldVal = diffOld[key];
    const newVal = diffNew[key];

    if (oldVal !== undefined && newVal !== undefined) {
      changes.push(`${key}: ${formatValue(oldVal)} → ${formatValue(newVal)}`);
    } else if (newVal !== undefined) {
      changes.push(`${key}: (set to ${formatValue(newVal)})`);
    } else if (oldVal !== undefined) {
      changes.push(`${key}: (removed)`);
    }
  }

  return changes.length > 0 ? changes.join(', ') : 'No field changes detected';
}

/**
 * Format a value for human-readable display.
 */
function formatValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return val.length > 50 ? val.substring(0, 47) + '...' : val;
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val);
      return str.length > 50 ? str.substring(0, 47) + '...' : str;
    } catch {
      return '[Object]';
    }
  }
  return String(val);
}

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Create an audit log entry with automatic diff computation.
 *
 * If both oldValues and newValues are provided, only changed fields are stored
 * to keep the data compact. If only one is provided (e.g., create or delete),
 * all fields from that object are stored.
 *
 * The `details` field is auto-generated from the diff if not provided.
 */
export async function createAuditEntry(params: CreateAuditEntryParams): Promise<void> {
  try {
    const {
      action,
      entityType,
      entityId,
      userId,
      projectId,
      organizationId,
      oldValues,
      newValues,
      details,
    } = params;

    // Compute diff
    const { oldValues: diffOld, newValues: diffNew } = computeDiff(oldValues, newValues);

    // Determine what to store
    const metadataObj: Record<string, unknown> = {};

    if (action === 'create') {
      if (newValues) metadataObj.newValues = newValues;
    } else if (action === 'delete') {
      if (oldValues) metadataObj.oldValues = oldValues;
    } else {
      if (Object.keys(diffOld).length > 0) {
        metadataObj.oldValues = diffOld;
      }
      if (Object.keys(diffNew).length > 0) {
        metadataObj.newValues = diffNew;
      }
    }

    const auditDetails =
      details ?? generateDetailsFromDiff(diffOld, diffNew, action);

    if (!organizationId) {
      throw new Error('organizationId is required for audit logging to prevent tenant leakage');
    }
    const orgId = organizationId;

    const metadataStr = Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null;

    await db.activityLog.create({
      data: {
        userId,
        projectId: projectId ?? null,
        action,
        entityType,
        entityId,
        details: auditDetails,
        metadata: metadataStr,
        organizationId: orgId,
      },
    });
  } catch (error) {
    // Audit logging should never break the main operation.
    // Log the error but don't throw.
    log.error('[AuditHelper] Failed to create audit entry', {
      error: error instanceof Error ? error.message : String(error),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  }
}

/**
 * Convenience: create an audit entry for a "create" action.
 * Stores the new record's values.
 */
export async function auditCreate(params: {
  entityType: string;
  entityId: string;
  userId: string;
  projectId?: string;
  organizationId?: string | null;
  newValues: Record<string, unknown>;
  details?: string;
}): Promise<void> {
  return createAuditEntry({ ...params, action: 'create' });
}

/**
 * Convenience: create an audit entry for an "update" action.
 * Automatically diffs old vs new values.
 */
export async function auditUpdate(params: {
  entityType: string;
  entityId: string;
  userId: string;
  projectId?: string;
  organizationId?: string | null;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  details?: string;
}): Promise<void> {
  return createAuditEntry({ ...params, action: 'update' });
}

/**
 * Convenience: create an audit entry for a "delete" action.
 * Stores the deleted record's values.
 */
export async function auditDelete(params: {
  entityType: string;
  entityId: string;
  userId: string;
  projectId?: string;
  organizationId?: string | null;
  oldValues: Record<string, unknown>;
  details?: string;
}): Promise<void> {
  return createAuditEntry({ ...params, action: 'delete' });
}
