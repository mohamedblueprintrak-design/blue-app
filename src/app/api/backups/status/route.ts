/**
 * Backup Verification Status API Route
 * مسار حالة التحقق من النسخ الاحتياطي
 *
 * GET /api/backups/status — Get verification status/history
 *   Query params:
 *     limit — Number of records to return (default 50, max 200)
 *
 * Returns verification history from the BackupVerification model,
 * including file sizes, checksums, integrity check results,
 * record counts, and status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupVerificationService } from '@/lib/services/backup-verification.service';
import { backupService } from '@/lib/backup-service';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Query params schema
const statusQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * GET — Get verification status and history
 * جلب حالة التحقق من النسخ الاحتياطي
 */
export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK — Admin only
    const rbac = await requireVerifiedAdmin(request);
    if ('error' in rbac) return rbac.error;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit') || '50';
    const parsedLimit = statusQuerySchema.safeParse({ limit: limitParam });

    const limit = parsedLimit.success ? parsedLimit.data.limit : 50;

    // Determine organization ID from the admin user
    const organizationId = rbac.user.organizationId || undefined;

    // Fetch verification history
    const history = await backupVerificationService.getVerificationHistory(limit, organizationId);

    // Fetch backup stats for context
    const backupStats = await backupService.getStats();

    // Compute summary statistics
    const totalVerifications = history.length;
    const verified = history.filter(h => h.status === 'verified').length;
    const failed = history.filter(h => h.status === 'failed').length;
    const latestVerification = history.length > 0 ? history[0] : null;

    // Check if the latest backup has been verified
    let latestBackupVerified = false;
    if (latestVerification && backupStats.newestBackup) {
      const latestBackupTime = new Date(backupStats.newestBackup).getTime();
      const latestVerifyTime = new Date(latestVerification.createdAt).getTime();
      latestBackupVerified = latestVerifyTime >= latestBackupTime && latestVerification.status === 'verified';
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalVerifications,
          verified,
          failed,
          latestBackupVerified,
          lastVerifiedAt: latestVerification?.createdAt || null,
          lastStatus: latestVerification?.status || null,
        },
        backupStats: {
          totalBackups: backupStats.totalBackups,
          totalSize: backupStats.totalSize,
          dbType: backupStats.dbType,
          newestBackup: backupStats.newestBackup,
          oldestBackup: backupStats.oldestBackup,
        },
        history: history.map(record => ({
          id: record.id,
          backupPath: record.backupPath,
          fileSize: record.fileSize,
          checksum: record.checksum,
          status: record.status,
          integrityCheck: record.integrityCheck,
          recordCount: record.recordCount,
          errorMessage: record.errorMessage,
          createdAt: record.createdAt,
        })),
      },
    });
  } catch (error) {
    log.error('Error fetching backup verification status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch backup verification status' },
      { status: 500 },
    );
  }
}
