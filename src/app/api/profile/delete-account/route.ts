import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedAuth } from '@/app/api/utils/auth';
import { compare } from 'bcryptjs';
import { rateLimit } from '@/lib/cache/redis';
import { log } from '@/lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteAccountBody {
  password: string;
  confirmText: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory rate limit fallback (for when Redis is unavailable)
// ─────────────────────────────────────────────────────────────────────────────

const deleteRateLimits = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of deleteRateLimits.entries()) {
    if (value.resetAt <= now) {
      deleteRateLimits.delete(key);
    }
  }
}, 300_000);

function inMemoryRateLimit(userId: string): { allowed: boolean; retryAfterSeconds: number } {
  const key = `delete-account:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const existing = deleteRateLimits.get(key);

  if (!existing || existing.resetAt <= now) {
    deleteRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= 1) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  existing.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/profile/delete-account
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Step 1: Verify authentication ──
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // ── Step 2: Parse and validate request body ──
    let body: DeleteAccountBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'طلب غير صالح' } },
        { status: 400 }
      );
    }

    const { password, confirmText } = body;

    // Validate password is provided
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: { code: 'PASSWORD_REQUIRED', message: 'يرجى إدخال كلمة المرور' } },
        { status: 400 }
      );
    }

    // Validate confirmation text
    if (confirmText !== 'DELETE') {
      return NextResponse.json(
        { error: { code: 'CONFIRM_TEXT_MISMATCH', message: 'يرجى كتابة DELETE للتأكيد' } },
        { status: 400 }
      );
    }

    // ── Step 3: Rate limiting (1 attempt per hour per user) ──
    const rateLimitResult = await rateLimit(`delete-account:${ctx.userId}`, 1, 3600);
    if (!rateLimitResult.allowed) {
      // Fallback: also check in-memory rate limit
      const memResult = inMemoryRateLimit(ctx.userId);
      if (!memResult.allowed) {
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: `تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة مرة أخرى بعد ${memResult.retryAfterSeconds} ثانية`,
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(memResult.retryAfterSeconds),
            },
          }
        );
      }
    }

    // ── Step 4: Verify password ──
    const userRecord = await db.user.findUnique({
      where: { id: ctx.userId },
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' } },
        { status: 404 }
      );
    }

    // Check if already deleted
    if (userRecord.deletedAt) {
      return NextResponse.json(
        { error: { code: 'ALREADY_DELETED', message: 'هذا الحساب محذوف بالفعل' } },
        { status: 400 }
      );
    }

    // Verify password using bcrypt
    if (!userRecord.password || !userRecord.password.startsWith('$2')) {
      return NextResponse.json(
        { error: { code: 'INVALID_PASSWORD', message: 'كلمة المرور غير صحيحة' } },
        { status: 400 }
      );
    }

    const isPasswordValid = await compare(password, userRecord.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: { code: 'INVALID_PASSWORD', message: 'كلمة المرور غير صحيحة' } },
        { status: 400 }
      );
    }

    // ── Step 5: Check if user is the only admin in their organization ──
    if (userRecord.organizationId) {
      const adminCount = await db.user.count({
        where: {
          organizationId: userRecord.organizationId,
          role: 'ADMIN',
          deletedAt: null,
          isActive: true,
        },
      });

      if (userRecord.role === 'ADMIN' && adminCount <= 1) {
        return NextResponse.json(
          {
            error: {
              code: 'SOLE_ADMIN',
              message: 'أنت المسؤول الوحيد في المؤسسة. يرجى نقل صلاحية الإدارة إلى مستخدم آخر قبل حذف حسابك',
            },
          },
          { status: 400 }
        );
      }
    }

    // ── Step 6: Soft delete — set deletedAt and anonymize PII ──
    await db.user.update({
      where: { id: ctx.userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${ctx.userId}@redacted`,
        name: 'Deleted User',
        phone: '',
        avatar: '',
        isActive: false,
      },
    });

    // ── Step 7: Invalidate all sessions (delete refresh tokens) ──
    await db.refreshToken.deleteMany({
      where: { userId: ctx.userId },
    });

    // ── Step 8: Log the deletion in ActivityLog ──
    await db.activityLog.create({
      data: {
        userId: ctx.userId,
        action: 'delete',
        entityType: 'User',
        entityId: ctx.userId,
        details: 'Account self-deleted by user',
        metadata: JSON.stringify({
          previousEmail: userRecord.email,
          previousName: userRecord.name,
          organizationId: userRecord.organizationId,
        }),
        organizationId: userRecord.organizationId,
      },
    });

    log.info('Account self-deleted', {
      userId: ctx.userId,
      email: userRecord.email,
      organizationId: userRecord.organizationId,
    });

    // ── Step 9: Return success with cookie-clearing headers ──
    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: 'تم حذف حسابك بنجاح',
          messageEn: 'Your account has been successfully deleted',
        },
      },
      { status: 200 }
    );

    // Clear auth cookies
    response.cookies.set('blue_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    response.cookies.set('csrf_token', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    log.error('Delete account error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'حدث خطأ في الخادم' } },
      { status: 500 }
    );
  }
}
