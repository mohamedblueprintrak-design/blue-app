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
 * 6. Old activity logs (> 365 days) — prevents unbounded growth
 * 7. Old AI chat messages (> 180 days) — prevents unbounded growth
 * 8. Old push subscriptions (bounced/inactive > 30 days)
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

    // 1b. Clean orphaned refresh tokens (userId references a deleted user)
    //     SQLite does not enforce foreign keys, so orphaned tokens can accumulate
    //     after users are deleted or the database is re-seeded.
    try {
      const allTokens = await db.refreshToken.findMany({ select: { id: true, userId: true } });
      // Build a set of existing user IDs to check against
      const existingUsers = await db.user.findMany({ select: { id: true } });
      const existingUserIds = new Set(existingUsers.map(u => u.id));
      // An orphaned token is one where userId is null OR points to a deleted user
      const orphanedIds = allTokens
        .filter(t => !t.userId || !existingUserIds.has(t.userId))
        .map(t => t.id);
      if (orphanedIds.length > 0) {
        const deleted = await db.refreshToken.deleteMany({ where: { id: { in: orphanedIds } } });
        results.orphanedRefreshTokens = deleted.count;
      } else {
        results.orphanedRefreshTokens = 0;
      }
    } catch {
      results.orphanedRefreshTokens = 0;
    }

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

    // 6. Clean old activity logs (> 365 days)
    // ActivityLog grows unbounded without retention — every CRUD operation
    // creates an entry. At 1000+ operations/day, this table reaches millions
    // of rows within a year, slowing dashboard queries.
    // Retention: 1 year (365 days). Older entries are deleted.
    // For compliance/forensics, SecurityAuditLog retains 180 days separately.
    try {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const oldActivityLogs = await db.activityLog.deleteMany({
        where: {
          createdAt: { lt: oneYearAgo },
        },
      });
      results.oldActivityLogs = oldActivityLogs.count;
    } catch {
      results.oldActivityLogs = 0;
    }

    // 7. Clean old AI chat messages (> 180 days)
    // AIChatMessage stores every LLM interaction. Active users accumulate
    // thousands of messages. Retention: 6 months (180 days).
    // Conversations with no remaining messages are cleaned up automatically
    // by the onDelete: Cascade on AIChatMessage → AIChatConversation.
    try {
      const oldAiMessages = await db.aIChatMessage.deleteMany({
        where: {
          createdAt: { lt: hundredEightyDaysAgo },
        },
      });
      results.oldAiChatMessages = oldAiMessages.count;
    } catch {
      results.oldAiChatMessages = 0;
    }

    // 8. Clean orphaned AI chat conversations (no messages left)
    try {
      const orphanedConversations = await db.aIChatConversation.deleteMany({
        where: {
          messages: { none: {} },
        },
      });
      results.orphanedAiConversations = orphanedConversations.count;
    } catch {
      results.orphanedAiConversations = 0;
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
    models: ['RefreshToken', 'PasswordResetToken', 'EmailVerificationToken', 'Notification', 'SecurityAuditLog', 'ActivityLog', 'AIChatMessage', 'AIChatConversation'],
  });
}
