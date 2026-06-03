/**
 * Backup Verification API Route
 * مسار التحقق من النسخ الاحتياطي
 *
 * POST /api/backups/verify — Trigger verification of a backup file or the latest backup
 *   Body: { filename?: string } — If omitted, verifies the latest backup
 *
 * Uses the enhanced BackupVerificationService which:
 * - Validates file integrity (size, readability)
 * - Computes SHA-256 checksums
 * - Runs SQLite PRAGMA integrity_check
 * - Counts records in key tables
 * - Persists results to the BackupVerification model
 * - Alerts on failure
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupVerificationService } from '@/lib/services/backup-verification.service';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';
import path from 'path';

// Zod schema for verification request
const verifyBackupSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(/^blueprint_backup_[\w\-]+\.(\db|sql\.gz)$/, 'Invalid backup filename format')
    .optional(),
});

/**
 * POST — Trigger verification of a specific backup or the latest backup
 * التحقق من سلامة النسخة الاحتياطية
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — 3 req/hour
    const { result: rlResult } = await withRateLimit(request, 'passwordReset');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    // RBAC CHECK — Admin only
    const rbac = await requireVerifiedAdmin(request);
    if ('error' in rbac) return rbac.error;

    // Parse and validate request body (optional)
    let filename: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body === 'object') {
        const validation = verifyBackupSchema.safeParse(body);
        if (validation.success && validation.data.filename) {
          filename = validation.data.filename;
        }
      }
    } catch {
      // Body is optional — if no body, verify latest backup
    }

    // Determine organization ID from the admin user
    const organizationId = rbac.user.organizationId || undefined;

    let result;

    if (filename) {
      // Verify a specific backup file
      const backupDir = path.join(process.cwd(), 'db', 'backups');
      const backupPath = path.join(backupDir, filename);

      // Security: validate the path stays within backup directory
      const resolvedPath = path.resolve(backupPath);
      const resolvedDir = path.resolve(backupDir);
      if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
        return NextResponse.json(
          { success: false, error: 'Invalid backup filename' },
          { status: 400 },
        );
      }

      result = await backupVerificationService.verifyBackup(resolvedPath, organizationId);

      log.info(`[Backup Verify] Admin ${rbac.user.userId} verified backup: ${filename}, valid=${result.valid}`);
    } else {
      // Verify the latest backup
      result = await backupVerificationService.verifyLatestBackup(organizationId);

      log.info(`[Backup Verify] Admin ${rbac.user.userId} verified latest backup, valid=${result.valid}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: result.valid,
        checksum: result.checksum,
        size: result.fileSize,
        integrityCheck: result.integrityCheck,
        recordCounts: result.recordCount,
        status: result.status,
        verifiedAt: result.verifiedAt,
        ...(result.error && { error: result.error }),
      },
    });
  } catch (error) {
    log.error('Error verifying backup:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during backup verification' },
      { status: 500 },
    );
  }
}
