import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { timingSafeEqual } from 'crypto';

/**
 * POST /api/cron/cleanup — Cleanup expired tokens and stale data
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access.
 * Call with: curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/cron/cleanup
 *
 * Cleans up:
 * 1. Expired/revoked refresh tokens
 * 2. Expired password reset tokens
 * 3. Expired email verification tokens
 * 4. Old read notifications (> 90 days)
 * 5. Old security audit logs (> 180 days)
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error('[Cron] CRON_SECRET not configured — cleanup endpoint disabled');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader.length !== expectedAuth.length || !timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedAuth, 'utf8'))) {
    log.security('[Cron] Unauthorized cleanup attempt', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, number> = {};
  const now = new Date();

  try {
    // 1. Clean expired/revoked refresh tokens
    const expiredTokens = await db.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { not: null } },
        ],
      },
    });
    results.expiredRefreshTokens = expiredTokens.count;

    // 2. Clean expired password reset tokens (older than 24 hours)
    const expiredResetTokens = await db.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    results.expiredPasswordResetTokens = expiredResetTokens.count;

    // 3. Clean expired email verification tokens
    const expiredVerifyTokens = await db.emailVerificationToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    results.expiredEmailVerificationTokens = expiredVerifyTokens.count;

    // 4. Clean old read notifications (> 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oldNotifications = await db.notification.deleteMany({
      where: {
        isRead: true,
        updatedAt: { lt: ninetyDaysAgo },
      },
    });
    results.oldReadNotifications = oldNotifications.count;

    // 5. Clean old security audit logs (> 180 days)
    const hundredEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    // Check if SecurityAuditLog model exists
    try {
      const oldAuditLogs = await db.securityAuditLog.deleteMany({
        where: {
          createdAt: { lt: hundredEightyDaysAgo },
        },
      });
      results.oldSecurityAuditLogs = oldAuditLogs.count;
    } catch {
      // Model may not exist — skip
      results.oldSecurityAuditLogs = 0;
    }

    log.info('[Cron] Cleanup completed', results);

    

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      cleaned: results,
    });
  } catch (error) {
    log.error('[Cron] Cleanup failed:', error);
    return NextResponse.json(
      { success: false, error: 'Cleanup failed', cleaned: results },
      { status: 500 },
    );
  }
}

// Also support GET for health check
// SECURITY: Require CRON_SECRET for all responses to prevent information leakage
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ status: 'disabled' }, { status: 200 });
  }
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader.length !== expectedAuth.length || !timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedAuth, 'utf8'))) {
    // Return 404 instead of revealing the endpoint exists
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    status: 'ready',
    models: ['RefreshToken', 'PasswordResetToken', 'EmailVerificationToken', 'Notification', 'SecurityAuditLog'],
  });
}
