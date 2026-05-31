/**
 * Resend Email Verification API Route
 * مسار إعادة إرسال رابط التحقق
 * 
 * POST /api/auth/resend-verification - Resend verification email
 */

import { NextRequest } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { successResponse, errorResponse } from '../../utils/response';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * POST - Resend verification email
 */
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'emailVerification');
  const blocked = rateLimitResponse(result);
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

    // Always return success to prevent enumeration
    return successResponse({
      message: 'إذا كان هناك حساب بهذا البريد ولم يتم التحقق منه، سيتم إرسال رابط التحقق',
    });
  } catch {
    // Still return success to prevent enumeration
    return successResponse({
      message: 'إذا كان هناك حساب بهذا البريد ولم يتم التحقق منه، سيتم إرسال رابط التحقق',
    });
  }
}
