import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { validateRequest, resetPasswordSchema } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { hashToken } from '@/lib/auth/token-utils';
import { validatePasswordStrength } from '@/lib/auth/modules/password';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting — passwordReset limiter (3 req/hour)
    const { result: rlResult } = await withRateLimit(request, 'passwordReset');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    const body = await request.json();
    const validation = validateRequest(resetPasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { token, password } = validation.data;

    // Validate password strength before proceeding
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }

    // Hash the incoming token to look up the stored hash in PasswordResetToken model
    const hashedToken = await hashToken(token);

    // Find the password reset token record
    const resetRecord = await db.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" }, { status: 400 });
    }

    // Check if token has expired
    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" }, { status: 400 });
    }

    // Check if token has already been used
    if (resetRecord.usedAt) {
      return NextResponse.json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" }, { status: 400 });
    }

    // Find user by the email in the reset token record
    const user = await db.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user) {
      return NextResponse.json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await hash(password, 12);

    // Update user password and mark token as used in a transaction
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(), // Invalidate existing JWT tokens
        },
      }),
      db.passwordResetToken.update({
        where: { token: hashedToken },
        data: { usedAt: new Date() },
      }),
    ]);

    // Invalidate all existing refresh tokens for security
    await db.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    log.error("Reset password error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
