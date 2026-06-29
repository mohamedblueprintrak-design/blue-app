/**
 * Backup Restore API Route
 * POST /api/backup/restore - Restore from backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/backup-service';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * POST - Restore from backup
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — strict limiter for destructive endpoint
    const { result: rlResult } = await withRateLimit(request, 'strict');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    // RBAC CHECK - Admin only (JWT-verified for backup restore)
    const rbac = await requireVerifiedAdmin(request);
    if ('error' in rbac) return rbac.error;
    const _user = rbac.user;

    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);
    const { filename } = sanitizedBody;

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'اسم ملف النسخة الاحتياطية مطلوب' },
        { status: 400 }
      );
    }

    // Security: Validate filename to prevent path traversal (including backslash and null byte)
    if (!filename.startsWith('blueprint_backup_') || (!filename.endsWith('.db') && !filename.endsWith('.sql.gz')) || filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
      return NextResponse.json(
        { success: false, error: 'اسم ملف غير صالح' },
        { status: 400 }
      );
    }

    const result = await backupService.restoreBackup(filename);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'فشل في استعادة النسخة الاحتياطية' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'تم استعادة النسخة الاحتياطية بنجاح',
        filename,
        restoredAt: new Date(),
      },
    });
  } catch (error) {
    log.error('Error restoring backup:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء استعادة النسخة الاحتياطية' },
      { status: 500 }
    );
  }
}
