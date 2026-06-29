/**
 * Backup API Routes
 * GET /api/backup - List all backups
 * POST /api/backup - Create new backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/backup-service';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * GET - List all backups with stats
 */
export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK - Admin only (JWT-verified for backup operations)
    const rbac = await requireVerifiedAdmin(request);
    if ('error' in rbac) return rbac.error;
    const _user = rbac.user;

    const backups = await backupService.listBackups();
    const stats = await backupService.getStats();

    return NextResponse.json({
      success: true,
      data: { backups, stats },
    });
  } catch (error) {
    log.error('Error listing backups:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب قائمة النسخ الاحتياطي' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new backup
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — strict limiter (5 req/min)
    const { result: rlResult } = await withRateLimit(request, 'strict');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    // RBAC CHECK - Admin only (JWT-verified for backup operations)
    const rbac = await requireVerifiedAdmin(request);
    if ('error' in rbac) return rbac.error;
    const _user = rbac.user;

    const result = await backupService.createBackup();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'فشل في إنشاء النسخة الاحتياطية' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'تم إنشاء النسخة الاحتياطية بنجاح',
        backup: result,
      },
    });
  } catch (error) {
    log.error('Error creating backup:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء النسخة الاحتياطية' },
      { status: 500 }
    );
  }
}
