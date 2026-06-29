/**
 * Two-Factor Authentication API Route
 * مسار المصادقة الثنائية
 * 
 * GET /api/auth/2fa - Get 2FA status and setup info
 * POST /api/auth/2fa - Setup or Enable 2FA
 * DELETE /api/auth/2fa - Disable 2FA
 * 
 * Sub-routes:
 * POST /api/auth/2fa/verify - Verify 2FA code during login
 * POST /api/auth/2fa/backup-codes - Regenerate backup codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { successResponse, errorResponse } from '../../utils/response';
import { requireVerifiedAuth } from '../../utils/auth';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { validateRequest, twoFactorSetupSchema, twoFactorDisableSchema } from '@/lib/api-validation';

/**
 * GET - Get 2FA status and setup info
 */
export async function GET(request: NextRequest) {
  // SECURITY FIX: Use requireVerifiedAuth() to prevent header forgery
  // on 2FA status endpoint — reveals security configuration.
  const authResult = await requireVerifiedAuth(request);
  if ('error' in authResult) return authResult.error;
  const ctx = authResult.user;

  try {
    const has2FA = await authService.hasTwoFactorEnabled(ctx.userId);

    return successResponse({
      enabled: has2FA,
      message: has2FA 
        ? 'المصادقة الثنائية مفعلة' 
        : 'المصادقة الثنائية غير مفعلة',
    });
  } catch {
    return errorResponse('حدث خطأ في جلب حالة المصادقة الثنائية', 'FETCH_ERROR', 500);
  }
}

/**
 * POST - Setup or Enable 2FA
 * Body: { action: 'setup' | 'enable', code?: string }
 */
export async function POST(request: NextRequest) {
  // SECURITY FIX: Use requireVerifiedAuth() to prevent header forgery
  // on 2FA setup/enable — enables or disables account security.
  const authResult = await requireVerifiedAuth(request);
  if ('error' in authResult) return authResult.error;
  const ctx = authResult.user;

  try {
    // Rate limiting — auth limiter (10 req/min)
    const { result: rlResult } = await withRateLimit(request, 'auth');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    const body = await request.json();

    // Zod validation for 2FA setup/enable
    const validation = validateRequest(twoFactorSetupSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { action, code } = validation.data;

    if (action === 'setup') {
      // Generate new 2FA secret and return QR code URL
      const { secret, qrCodeUrl } = await authService.generateTwoFactorSecret(ctx.userId);

      return successResponse({
        message: 'تم إنشاء رمز المصادقة الثنائية. امسح الرمز بتطبيق المصادقة الخاص بك.',
        secret,
        qrCodeUrl,
        manualEntryKey: secret,
      });
    }

    if (action === 'enable') {
      // code is guaranteed by Zod refine when action === 'enable'
      if (!code) {
        return errorResponse('رمز التحقق مطلوب', 'CODE_REQUIRED', 400);
      }

      const result = await authService.enableTwoFactor(ctx.userId, code);

      if (!result.success) {
        return errorResponse(
          result.error || 'فشل تفعيل المصادقة الثنائية',
          result.code || 'ENABLE_FAILED',
          400
        );
      }

      return successResponse({
        message: 'تم تفعيل المصادقة الثنائية بنجاح',
        backupCodes: result.backupCodes,
      });
    }

    return errorResponse('إجراء غير صحيح', 'INVALID_ACTION', 400);
  } catch (error) {
    log.error('2FA POST error:', error);
    return errorResponse('حدث خطأ غير متوقع', 'INTERNAL_ERROR', 500);
  }
}

/**
 * DELETE - Disable 2FA
 * Body: { password: string }
 */
export async function DELETE(request: NextRequest) {
  // SECURITY FIX: Use requireVerifiedAuth() to prevent header forgery
  // on 2FA disable — removes account security protection.
  const authResult = await requireVerifiedAuth(request);
  if ('error' in authResult) return authResult.error;
  const ctx = authResult.user;

  try {
    // Rate limiting — auth limiter (10 req/min)
    const { result: rlResult } = await withRateLimit(request, 'auth');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    const body = await request.json();

    // Zod validation for 2FA disable
    const validation = validateRequest(twoFactorDisableSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { password } = validation.data;

    const result = await authService.disableTwoFactor(ctx.userId, password);

    if (!result.success) {
      return errorResponse(
        result.error || 'فشل إلغاء المصادقة الثنائية',
        result.code || 'DISABLE_FAILED',
        400
      );
    }

    return successResponse({
      message: 'تم إلغاء المصادقة الثنائية بنجاح',
    });
  } catch (error) {
    log.error('2FA DELETE error:', error);
    return errorResponse('حدث خطأ غير متوقع', 'INTERNAL_ERROR', 500);
  }
}
