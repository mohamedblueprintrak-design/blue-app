/**
 * @module security
 * @description Barrel export for BluePrint security modules.
 *
 * Import individual modules as needed:
 * ```ts
 * import { auditLog } from '@/lib/security';
 * // or directly:
 * import { auditLog } from '@/lib/security/audit-logger';
 * import { sanitizeObject } from '@/lib/security/sanitize';
 * ```
 */

// ─── Audit Logging ───────────────────────────────────────────────────────────
export {
  AuditLogger,
  auditLog,
  initAuditLogger,
  getAuditLogger,
  type LogLevel,
  type LogCategory,
  type AuditLogEntry,
  type AuditLoggerOptions,
  type SafeAuditLogEntry,
} from './audit-logger';
