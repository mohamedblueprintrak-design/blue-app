/**
 * Audit Service
 * خدمة التدقيق
 *
 * Writes audit events DIRECTLY to the ActivityLog table via Prisma.
 *
 * SECURITY FIX: Previously this function called `auditLog()` from
 * `@/lib/security/audit-logger`, which buffers entries in memory and
 * flushes via `persistToDatabase()`. However, `setPrismaClient()` was
 * never called at startup, AND the model lookup (`prisma.activity ??
 * prisma.auditLog`) didn't match the actual delegate (`prisma.activityLog`).
 * As a result, EVERY `logAudit()` call from services (invoices, projects,
 * clients, tasks, payments) was silently lost in production.
 *
 * This fix bypasses the broken AuditLogger buffer/flush pipeline and
 * writes directly to `db.activityLog.create()` — immediate, reliable,
 * and uses the same Prisma client as the rest of the app.
 *
 * The standalone `AuditLogger` class in audit-logger.ts is still available
 * for code that wants buffered/batch logging (with `setPrismaClient()` now
 * called in instrumentation.ts and the model lookup fixed to use
 * `prisma.activityLog`).
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';

export interface AuditLogParams {
  userId: string;
  organizationId?: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event directly to the ActivityLog table.
 *
 * SECURITY: organizationId is REQUIRED — without it, the audit entry
 * would either fail the DB constraint (NOT NULL) or leak across tenants.
 * If missing, we log a security warning and skip the write (rather than
 * crash the caller's transaction).
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    // SECURITY: Reject entries without organizationId to prevent tenant leakage.
    // audit-helper.ts enforces the same rule (throws). We skip + warn instead
    // of throwing to avoid crashing the caller's business transaction.
    if (!params.organizationId) {
      log.security('logAudit: organizationId missing — audit entry skipped', {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
      });
      return;
    }

    await db.activityLog.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.description,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // Log but don't throw — audit logging is a side-effect, not the primary
    // operation. Crashing here would rollback the caller's transaction.
    log.error('logAudit: failed to persist audit entry', {
      error: error instanceof Error ? error.message : String(error),
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  }
}

const auditService = { logAudit };

export default auditService;
