import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedAuth } from '@/app/api/utils/auth';
import { hasPermission } from '@/lib/auth/modules/authorization';
import { Permission } from '@/lib/auth/types';
import { validateRequest, changePasswordSchema } from '@/lib/api-validation';
import { hash, compare } from "bcryptjs";
import { log } from '@/lib/logger';
import { validatePasswordStrength, checkPasswordBreached } from '@/lib/auth/modules/password';

/**
 * PUT /api/profile/password - Change password
 *
 * Uses JWT-verified auth (requireVerifiedAuth) to prevent header forgery.
 * - Users can change their OWN password (requires currentPassword verification).
 * - Admins with USER_UPDATE permission can reset another user's password
 *   (no currentPassword required for admin resets).
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const body = await request.json();

    // Determine target user — own password by default
    const targetUserId = body.userId || ctx.userId;
    const isOwnPassword = targetUserId === ctx.userId;

    // RBAC: Resetting someone else's password requires USER_UPDATE permission
    if (!isOwnPassword && !hasPermission(ctx.role, Permission.USER_UPDATE)) {
      return NextResponse.json(
        { error: "غير مصرح بإعادة تعيين كلمة مرور هذا المستخدم" },
        { status: 403 }
      );
    }

    if (isOwnPassword) {
      // ── User changing their OWN password ──
      // Requires current password verification for security
      const validation = validateRequest(changePasswordSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      const { currentPassword, newPassword } = validation.data;

      const userRecord = await db.user.findUnique({
        where: { id: ctx.userId },
      });

      if (!userRecord || !userRecord.password) {
        return NextResponse.json(
          { error: "المستخدم غير موجود أو لم يتم تعيين كلمة مرور" },
          { status: 404 }
        );
      }

      // Verify current password using bcrypt only
      // SECURITY: No plain text fallback — all passwords must be bcrypt-hashed
      if (!userRecord.password.startsWith("$2")) {
        // Password is not properly hashed — force reset required
        return NextResponse.json(
          { error: "كلمة المرور الحالية غير صحيحة. يرجى طلب إعادة تعيين كلمة المرور." },
          { status: 400 }
        );
      }

      const isPasswordValid = await compare(currentPassword, userRecord.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "كلمة المرور الحالية غير صحيحة" },
          { status: 400 }
        );
      }

      // SECURITY: Check if the new password has been found in data breaches
      const isBreached = await checkPasswordBreached(newPassword);
      if (isBreached) {
        return NextResponse.json(
          { error: 'This password has been found in a data breach. Please choose a different password.' },
          { status: 400 }
        );
      }

      // Always hash the new password with bcrypt before storing
      const hashedPassword = await hash(newPassword, 12);

      // Update password and invalidate refresh tokens atomically
      await db.$transaction([
        db.user.update({
          where: { id: userRecord.id },
          data: {
            password: hashedPassword,
            passwordChangedAt: new Date(),  // Invalidate existing tokens
          },
        }),
        db.refreshToken.deleteMany({
          where: { userId: userRecord.id },
        }),
      ]);

      return NextResponse.json({ success: true });
    } else {
      // ── Admin resetting another user's password ──
      // No current password required — admin override
      const newPassword = body.newPassword;
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length > 200) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        );
      }

      // SECURITY: Use full password strength validation instead of simple length check
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: passwordValidation.errors.join('. ') },
          { status: 400 }
        );
      }

      const userRecord = await db.user.findUnique({
        where: { id: targetUserId },
      });

      if (!userRecord) {
        return NextResponse.json(
          { error: "المستخدم غير موجود" },
          { status: 404 }
        );
      }

      // SECURITY: Prevent cross-organization password reset
      if (ctx.organizationId && userRecord.organizationId && userRecord.organizationId !== ctx.organizationId) {
        return NextResponse.json(
          { error: "غير مصرح بإعادة تعيين كلمة مرور هذا المستخدم" },
          { status: 403 }
        );
      }

      // SECURITY: Check if the new password has been found in data breaches
      const isBreached = await checkPasswordBreached(newPassword);
      if (isBreached) {
        return NextResponse.json(
          { error: 'This password has been found in a data breach. Please choose a different password.' },
          { status: 400 }
        );
      }

      // Hash the new password
      const hashedPassword = await hash(newPassword, 12);

      // Update password and invalidate refresh tokens atomically
      await db.$transaction([
        db.user.update({
          where: { id: userRecord.id },
          data: {
            password: hashedPassword,
            passwordChangedAt: new Date(),  // Invalidate existing tokens
          },
        }),
        db.refreshToken.deleteMany({
          where: { userId: userRecord.id },
        }),
      ]);

      // Audit log for admin password reset
      log.info('Admin password reset', {
        adminId: ctx.userId,
        adminRole: ctx.role,
        targetUserId: userRecord.id,
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    log.error("Change password error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
