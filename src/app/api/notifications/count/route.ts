import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedAuth, orgFilter } from '../../utils/auth';
import { hasPermission } from '@/lib/auth/modules/authorization';
import { Permission } from '@/lib/auth/types';

/**
 * GET /api/notifications/count - Get unread notification count
 *
 * RBAC logic:
 * - Users can read their OWN notification count without needing NOTIFICATION_READ permission.
 * - Reading another user's notification count requires NOTIFICATION_READ permission (admin-level).
 *
 * SECURITY: Uses requireVerifiedAuth to prevent header forgery —
 * a forged x-user-id would return another user's notification count.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // Determine target user — own notifications by default
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || ctx.userId;
    const isOwnNotifications = targetUserId === ctx.userId;

    // RBAC: Reading someone else's notification count requires NOTIFICATION_READ permission
    if (!isOwnNotifications && !hasPermission(ctx.role, Permission.NOTIFICATION_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const count = await db.notification.count({ where: { userId: targetUserId, isRead: false, ...orgFilter(ctx) } });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
