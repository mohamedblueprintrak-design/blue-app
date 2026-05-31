/**
 * Audit Service
 * خدمة التدقيق
 * 
 * Simple wrapper around the audit logger for auth-related audit logging
 */

import { auditLog } from '@/lib/security/audit-logger';

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
 * Log an audit event
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  await auditLog(
    `${params.entityType}.${params.action}`,
    {
      description: params.description,
      entityId: params.entityId,
      entityType: params.entityType,
      organizationId: params.organizationId,
      ...params.metadata,
    },
    params.userId
  );
}

const auditService = { logAudit };

export default auditService;
