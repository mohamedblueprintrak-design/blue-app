import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";
import { validateRequest, forgotPasswordSchema } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { hashToken } from '@/lib/auth/token-utils';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting — passwordReset limiter (3 req/hour)
    const { result: rlResult } = await withRateLimit(request, 'passwordReset');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    const body = await request.json();
    const validation = validateRequest(forgotPasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { email } = validation.data;

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({ success: true });
    }

    // Generate reset token — raw token is sent to user, only hash is stored
    const resetToken = randomBytes(32).toString("hex");

    // Store HASHED token in the PasswordResetToken model (not User.resetToken)
    // The raw token is only sent via email — never stored in plaintext
    await db.passwordResetToken.create({
      data: {
        email: user.email,
        token: await hashToken(resetToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    try {
      const template = emailTemplates.passwordReset(user.name || "المستخدم", resetUrl);
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (emailError) {
      log.error("Failed to send email:", emailError);
      // Still return success to not reveal if user exists
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Forgot password error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
