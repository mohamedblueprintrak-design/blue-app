/**
 * Backup Verification Service
 * خدمة التحقق من النسخ الاحتياطي
 *
 * Provides comprehensive backup verification including:
 * - File existence and readability checks
 * - File size validation (not 0, not suspiciously small)
 * - SHA-256 checksum computation and comparison
 * - SQLite PRAGMA integrity_check
 * - Record count validation for key tables
 * - Verification result persistence via BackupVerification model
 * - Alerting on verification failure
 */

import fs from 'fs/promises';
import type { Stats } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { log } from '@/lib/logger';
import { Prisma } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface VerificationResult {
  valid: boolean;
  checksum: string;
  fileSize: number;
  integrityCheck: string;
  recordCount: Record<string, number>;
  status: 'verified' | 'failed';
  error?: string;
  verifiedAt: string;
}

export interface VerificationRecord {
  id: string;
  backupPath: string;
  fileSize: number;
  checksum: string;
  status: string;
  integrityCheck: string;
  recordCount: string;
  errorMessage: string;
  organizationId: string | null;
  createdAt: Date;
}

// ============================================
// Configuration
// ============================================

/** Minimum acceptable backup file size in bytes (1 KB) */
const MIN_BACKUP_SIZE = 1024;

/** Key tables to check for record counts during verification */
const KEY_TABLES = ['User', 'Organization', 'Project', 'Task', 'Client', 'Invoice', 'Contract'];

const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgreSQL = DATABASE_URL.includes('postgresql://') || DATABASE_URL.includes('postgres://');

// ============================================
// Backup Verification Service Class
// ============================================

class BackupVerificationService {
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'db', 'backups');
  }

  /**
   * Validate that a file path is within the backup directory.
   * Prevents path traversal attacks.
   */
  private validateBackupPath(filename: string): string | null {
    const resolvedPath = path.resolve(this.backupDir, filename);
    const resolvedBackupDir = path.resolve(this.backupDir);
    if (!resolvedPath.startsWith(resolvedBackupDir + path.sep) && resolvedPath !== resolvedBackupDir) {
      log.error('[BackupVerify] Path traversal attempt detected:', { filename, resolvedPath });
      return null;
    }
    return resolvedPath;
  }

  /**
   * Verify a specific backup file.
   *
   * Steps:
   * 1. Check file exists and is readable
   * 2. Validate file size (not 0, not too small)
   * 3. Compute SHA-256 checksum
   * 4. Compare with stored checksum (if previous verification exists)
   * 5. Attempt to open the SQLite file and run PRAGMA integrity_check
   * 6. Attempt to read some data from key tables
   * 7. Store verification result with timestamp, file size, checksum, status
   *
   * @param backupPath - Full path to the backup file
   * @param organizationId - Optional organization ID for multi-tenant
   */
  async verifyBackup(backupPath: string, organizationId?: string): Promise<VerificationResult> {
    const verifiedAt = new Date().toISOString();
    let fileSize = 0;
    let checksum = '';
    let integrityCheckResult = '';
    const recordCount: Record<string, number> = {};
    let errorMessage = '';

    // ── Step 1: Check file exists and is readable ──────────────────────────
    try {
      await fs.access(backupPath, fs.constants.R_OK);
    } catch {
      return this.buildResult({
        valid: false,
        checksum: '',
        fileSize: 0,
        integrityCheck: '',
        recordCount: {},
        status: 'failed',
        error: 'Backup file not found or not readable',
        verifiedAt,
        backupPath,
        organizationId,
      });
    }

    // ── Step 2: Validate file size ─────────────────────────────────────────
    try {
      const stats = await fs.stat(backupPath);
      fileSize = stats.size;

      if (fileSize === 0) {
        return this.buildResult({
          valid: false,
          checksum: '',
          fileSize: 0,
          integrityCheck: '',
          recordCount: {},
          status: 'failed',
          error: 'Backup file is empty (0 bytes)',
          verifiedAt,
          backupPath,
          organizationId,
        });
      }

      if (fileSize < MIN_BACKUP_SIZE) {
        return this.buildResult({
          valid: false,
          checksum: '',
          fileSize,
          integrityCheck: '',
          recordCount: {},
          status: 'failed',
          error: `Backup file is suspiciously small (${fileSize} bytes, minimum ${MIN_BACKUP_SIZE})`,
          verifiedAt,
          backupPath,
          organizationId,
        });
      }
    } catch (err) {
      return this.buildResult({
        valid: false,
        checksum: '',
        fileSize: 0,
        integrityCheck: '',
        recordCount: {},
        status: 'failed',
        error: `Failed to read file stats: ${err instanceof Error ? err.message : 'Unknown error'}`,
        verifiedAt,
        backupPath,
        organizationId,
      });
    }

    // ── Step 3: Compute SHA-256 checksum ───────────────────────────────────
    try {
      const fileBuffer = await fs.readFile(backupPath);
      checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (err) {
      return this.buildResult({
        valid: false,
        checksum: '',
        fileSize,
        integrityCheck: '',
        recordCount: {},
        status: 'failed',
        error: `Failed to compute checksum: ${err instanceof Error ? err.message : 'Unknown error'}`,
        verifiedAt,
        backupPath,
        organizationId,
      });
    }

    // ── Step 4: Compare with stored checksum (if previous verification exists) ──
    try {
      const { db } = await import('@/lib/db');
      const previousVerification = await db.backupVerification.findFirst({
        where: {
          backupPath,
          status: 'verified',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (previousVerification && previousVerification.checksum) {
        if (previousVerification.checksum !== checksum) {
          log.warn(`[BackupVerify] Checksum mismatch for ${backupPath}. Previous: ${previousVerification.checksum.substring(0, 16)}..., Current: ${checksum.substring(0, 16)}...`);
          // Continue verification — checksum mismatch could indicate corruption or modification
        }
      }
    } catch (err) {
      log.warn('[BackupVerify] Could not compare with previous checksum:', { error: err instanceof Error ? err.message : String(err) });
    }

    // ── Step 5: For SQLite backups, run PRAGMA integrity_check ─────────────
    const isSQLiteBackup = backupPath.endsWith('.db');

    if (isSQLiteBackup) {
      try {
        // Open the backup file directly using better-sqlite3 (optional dependency)
        const sqlite = await import('better-sqlite3');
        const DatabaseConstructor = ('default' in sqlite ? sqlite.default : sqlite) as unknown as typeof import('better-sqlite3');
        const backupDb = new DatabaseConstructor(backupPath, { readonly: true });

        try {
          const result = backupDb.pragma('integrity_check');
          integrityCheckResult = (result as any)?.[0]?.integrity_check || 'unknown';

          if (integrityCheckResult !== 'ok') {
            log.error(`[BackupVerify] SQLite integrity check failed for ${backupPath}: ${integrityCheckResult}`);
          }
        } finally {
          backupDb.close();
        }
      } catch (err) {
        integrityCheckResult = 'error';
        errorMessage = `SQLite integrity check error: ${err instanceof Error ? err.message : 'Unknown error'}`;
        log.error(`[BackupVerify] ${errorMessage}`);
      }

      // ── Step 6: Read record counts from key tables ─────────────────────
      try {
        const sqlite2 = await import('better-sqlite3');
        const DatabaseConstructor2 = ('default' in sqlite2 ? sqlite2.default : sqlite2) as unknown as typeof import('better-sqlite3');
        const backupDb2 = new DatabaseConstructor2(backupPath, { readonly: true });

        try {
          // Get list of tables
          const tables = backupDb2.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'"
          ).all() as Array<{ name: string }>;

          const tableNames = tables.map(t => t.name);

          for (const table of KEY_TABLES) {
            if (tableNames.includes(table)) {
              try {
                const row = backupDb2.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get() as { count: number };
                recordCount[table] = Number(row?.count ?? 0);
              } catch {
                recordCount[table] = -1; // Error reading count
              }
            }
          }
        } finally {
          backupDb2.close();
        }
      } catch (err) {
        log.warn(`[BackupVerify] Could not read record counts: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // ── For PostgreSQL dumps, basic validation only ────────────────────────
    if (backupPath.endsWith('.sql.gz')) {
      integrityCheckResult = 'skipped_postgres_dump';
      // Note: recordCount is Record<string, number>, cannot store string notes here
    }

    // ── Determine overall status ───────────────────────────────────────────
    const integrityOk = integrityCheckResult === 'ok' || integrityCheckResult === 'skipped_postgres_dump';
    const hasData = Object.values(recordCount).some(c => c > 0);
    const valid = fileSize > 0 && integrityOk && (isSQLiteBackup ? hasData || Object.keys(recordCount).length === 0 : true);

    const status: 'verified' | 'failed' = valid ? 'verified' : 'failed';

    if (!valid && !errorMessage) {
      errorMessage = `Verification failed: integrity=${integrityCheckResult}, hasData=${hasData}`;
    }

    const result: VerificationResult = {
      valid,
      checksum,
      fileSize,
      integrityCheck: integrityCheckResult,
      recordCount,
      status,
      error: valid ? undefined : errorMessage || 'Verification failed',
      verifiedAt,
    };

    // ── Step 7: Store verification result ──────────────────────────────────
    await this.storeVerificationResult({
      backupPath,
      fileSize,
      checksum,
      status,
      integrityCheck: integrityCheckResult,
      recordCount,
      errorMessage: valid ? '' : errorMessage,
      organizationId,
    });

    // ── Alert on failure ───────────────────────────────────────────────────
    if (!valid) {
      await this.alertOnFailure(backupPath, errorMessage);
    }

    log.info(`[BackupVerify] Verification result for ${path.basename(backupPath)}: status=${status}, checksum=${checksum.substring(0, 16)}..., size=${fileSize}, integrity=${integrityCheckResult}`);

    return result;
  }

  /**
   * Verify the most recent backup.
   */
  async verifyLatestBackup(organizationId?: string): Promise<VerificationResult> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });

      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('blueprint_backup_') && (f.endsWith('.db') || f.endsWith('.sql.gz')))
        .sort()
        .reverse(); // Newest first

      if (backupFiles.length === 0) {
        return {
          valid: false,
          checksum: '',
          fileSize: 0,
          integrityCheck: '',
          recordCount: {},
          status: 'failed',
          error: 'No backup files found',
          verifiedAt: new Date().toISOString(),
        };
      }

      const latestFile = backupFiles[0];
      const backupPath = path.join(this.backupDir, latestFile);

      return await this.verifyBackup(backupPath, organizationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log.error('[BackupVerify] Error finding latest backup:', errorMessage);

      return {
        valid: false,
        checksum: '',
        fileSize: 0,
        integrityCheck: '',
        recordCount: {},
        status: 'failed',
        error: `Error finding latest backup: ${errorMessage}`,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get verification history.
   *
   * @param limit - Maximum number of records to return (default 50)
   * @param organizationId - Optional org filter
   */
  async getVerificationHistory(limit: number = 50, organizationId?: string): Promise<VerificationRecord[]> {
    try {
      const { db } = await import('@/lib/db');

      const where: Record<string, unknown> = {};
      if (organizationId) {
        where.organizationId = organizationId;
      }

      const records = await db.backupVerification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return records as unknown as VerificationRecord[];
    } catch (err) {
      log.error('[BackupVerify] Error fetching verification history:', err);
      return [];
    }
  }

  /**
   * Store verification result in the database.
   */
  private async storeVerificationResult(params: {
    backupPath: string;
    fileSize: number;
    checksum: string;
    status: string;
    integrityCheck: string;
    recordCount: Record<string, number>;
    errorMessage: string;
    organizationId?: string;
  }): Promise<void> {
    try {
      const { db } = await import('@/lib/db');

      await db.backupVerification.create({
        data: {
          backupPath: params.backupPath,
          fileSize: params.fileSize,
          checksum: params.checksum,
          status: params.status,
          integrityCheck: params.integrityCheck,
          recordCount: JSON.stringify(params.recordCount),
          errorMessage: params.errorMessage,
          organizationId: params.organizationId || null,
        },
      });

      log.info(`[BackupVerify] Stored verification result: ${params.status} for ${path.basename(params.backupPath)}`);
    } catch (err) {
      log.error('[BackupVerify] Failed to store verification result:', err);
    }
  }

  /**
   * Alert on verification failure.
   * Logs the failure and could be extended to send notifications.
   */
  private async alertOnFailure(backupPath: string, errorMessage: string): Promise<void> {
    log.error(`[BackupVerify] ⚠️ BACKUP VERIFICATION FAILED: ${path.basename(backupPath)} — ${errorMessage}`);

    try {
      // Could be extended to send notifications (email, Slack, etc.)
      // For now, we create a notification via the notification service if available
      const { db } = await import('@/lib/db');

      // Find admin users to notify
      const admins = await db.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          deletedAt: null,
        },
        take: 10,
        select: { id: true },
      });

      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: 'Backup Verification Failed',
            message: `Backup verification failed for ${path.basename(backupPath)}: ${errorMessage}`,
            type: 'SYSTEM',
            isRead: false,
          })),
        });

        log.info(`[BackupVerify] Alerted ${admins.length} admin(s) about verification failure`);
      }
    } catch (err) {
      log.error('[BackupVerify] Failed to send failure alert:', err);
    }
  }

  /**
   * Build a verification result and store it.
   */
  private async buildResult(params: {
    valid: boolean;
    checksum: string;
    fileSize: number;
    integrityCheck: string;
    recordCount: Record<string, number>;
    status: 'verified' | 'failed';
    error?: string;
    verifiedAt: string;
    backupPath: string;
    organizationId?: string;
  }): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: params.valid,
      checksum: params.checksum,
      fileSize: params.fileSize,
      integrityCheck: params.integrityCheck,
      recordCount: params.recordCount,
      status: params.status,
      error: params.error,
      verifiedAt: params.verifiedAt,
    };

    // Store the failed result too
    await this.storeVerificationResult({
      backupPath: params.backupPath,
      fileSize: params.fileSize,
      checksum: params.checksum,
      status: params.status,
      integrityCheck: params.integrityCheck,
      recordCount: params.recordCount,
      errorMessage: params.error || '',
      organizationId: params.organizationId,
    });

    if (!params.valid) {
      await this.alertOnFailure(params.backupPath, params.error || 'Unknown error');
    }

    return result;
  }
}

// Export singleton instance
export const backupVerificationService = new BackupVerificationService();
