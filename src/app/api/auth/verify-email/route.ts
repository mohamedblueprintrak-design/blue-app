/**
 * Email Verification API Route
 * مسار التحقق من البريد الإلكتروني
 * 
 * GET /api/auth/verify-email?token=xxx - Verify email with token
 * POST /api/auth/verify-email - Resend verification email
 */

import { NextRequest } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { successResponse, errorResponse } from '../../utils/response';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * GET - Verify email with token
 * Rate limited to prevent brute-force token guessing
 */
export async function GET(request: NextRequest) {
  // Rate limit to prevent brute-force guessing of email verification tokens
  const rlResult = await withRateLimit(request, 'emailVerification');
  const blocked = rateLimitResponse(rlResult.result);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return errorResponse('رمز التحقق مطلوب', 'TOKEN_REQUIRED', 400);
  }

  const verifyResult = await authService.verifyEmail(token);

  if (!verifyResult.success) {
    return errorResponse(
      verifyResult.error || 'فشل التحقق من البريد الإلكتروني',
      verifyResult.code || 'VERIFICATION_FAILED',
      400
    );
  }

  return successResponse({
    message: 'تم التحقق من بريدك الإلكتروني بنجاح',
    user: verifyResult.user,
  });
}

/**
 * POST - Resend verification email
 */
export async function POST(request: NextRequest) {
  const rlResult = await withRateLimit(request, 'emailVerification');
  const blocked = rateLimitResponse(rlResult.result);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return errorResponse('البريد الإلكتروني مطلوب', 'EMAIL_REQUIRED', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('صيغة البريد الإلكتروني غير صحيحة', 'INVALID_EMAIL', 400);
    }

    await authService.resendVerificationEmail(email);

    // Always return success to prevent email enumeration
    return successResponse({
      message: 'إذا كان هناك حساب بهذا البريد، سيتم إرسال رابط التحقق',
    });
  } catch {
    return errorResponse('حدث خطأ غير متوقع', 'INTERNAL_ERROR', 500);
  }
}
