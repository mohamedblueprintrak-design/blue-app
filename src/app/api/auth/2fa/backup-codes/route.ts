/**
 * 2FA Backup Codes API Route
 * مسار رموز الاسترداد للمصادقة الثنائية
 * 
 * POST /api/auth/2fa/backup-codes - Regenerate backup codes
 */

import { NextRequest } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { successResponse, errorResponse } from '../../../utils/response';
import { requireVerifiedAuth } from '../../../utils/auth';
import { log } from '@/lib/logger';

/**
 * POST - Regenerate backup codes
 * Body: { password: string }
 */
export async function POST(request: NextRequest) {
  // SECURITY FIX: Use requireVerifiedAuth() instead of requireVerifiedAuth()
  // to prevent header forgery — backup codes grant account recovery access.
  const authResult = await requireVerifiedAuth(request);
  if ('error' in authResult) return authResult.error;
  const ctx = authResult.user;

  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return errorResponse('كلمة المرور مطلوبة', 'PASSWORD_REQUIRED', 400);
    }

    const result = await authService.regenerateBackupCodes(ctx.userId, password);

    if (!result.success) {
      return errorResponse(
        result.error || 'فشل إعادة توليد رموز الاسترداد',
        result.code || 'REGENERATE_FAILED',
        400
      );
    }

    return successResponse({
      message: 'تم إعادة توليد رموز الاسترداد بنجاح. احفظها في مكان آمن.',
      backupCodes: result.backupCodes,
      warning: 'ستصبح الرموز القديمة غير صالحة فوراً',
    });
  } catch (error) {
    log.error('Regenerate backup codes error:', error);
    return errorResponse('حدث خطأ غير متوقع', 'INTERNAL_ERROR', 500);
  }
}
