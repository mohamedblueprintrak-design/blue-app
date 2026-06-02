import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedAuth, orgFilter } from '@/app/api/utils/auth';
import { hasPermission } from '@/lib/auth/modules/authorization';
import { Permission } from '@/lib/auth/types';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { handleApiError } from '@/lib/api-error';
import { z } from 'zod';

// Zod schema for notification update
const notificationUpdateSchema = z.object({
  id: z.string().cuid().optional(),
  markAllRead: z.boolean().optional(),
  userId: z.string().max(100).optional(),
});

/**
 * GET /api/notifications - List notifications
 *
 * RBAC logic:
 * - Users can read their OWN notifications without needing NOTIFICATION_READ permission.
 * - Reading another user's notifications requires NOTIFICATION_READ permission (admin-level).
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Use requireVerifiedAuth to prevent header forgery
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // Determine target user — own notifications by default
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || ctx.userId;
    const isOwnNotifications = targetUserId === ctx.userId;

    // RBAC: Reading someone else's notifications requires NOTIFICATION_READ permission
    if (!isOwnNotifications && !hasPermission(ctx.role, Permission.NOTIFICATION_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const filter = searchParams.get('filter') || 'all';
    const projectId = searchParams.get('projectId');
    const { page, limit } = parsePaginationParams(searchParams);

    // Notifications are user-specific; filter by the target user's ID and org
    const where: Record<string, unknown> = { userId: targetUserId, ...orgFilter(ctx) };

    if (filter === 'unread') {
      where.isRead = false;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip: calculateSkip(page, limit),
        take: limit,
      }),
      db.notification.count({ where }),
    ]);

    const unreadCount = await db.notification.count({
      where: { userId: targetUserId, isRead: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Notifications GET');
  }
}

/**
 * PUT /api/notifications - Update notifications (mark as read)
 *
 * RBAC logic:
 * - Users can update their OWN notifications without needing NOTIFICATION_UPDATE permission.
 * - Updating another user's notifications requires NOTIFICATION_UPDATE permission (admin-level).
 */
export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Use requireVerifiedAuth to prevent header forgery
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const rawBody = await request.json();

    // Zod validation for notification update
    const validation = notificationUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { id, markAllRead, userId: bodyUserId } = validation.data;

    // Determine target user — own notifications by default
    const targetUserId = bodyUserId || ctx.userId;
    const isOwnNotifications = targetUserId === ctx.userId;

    // RBAC: Updating someone else's notifications requires NOTIFICATION_UPDATE permission
    if (!isOwnNotifications && !hasPermission(ctx.role, Permission.NOTIFICATION_UPDATE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (markAllRead) {
      await db.notification.updateMany({
        where: { userId: targetUserId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      const notification = await db.notification.findUnique({ where: { id } });
      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }

      // Verify notification ownership (or admin override)
      if (notification.userId !== ctx.userId && !hasPermission(ctx.role, Permission.NOTIFICATION_UPDATE)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await db.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'id or markAllRead is required' }, { status: 400 });
  } catch (error: unknown) {
    return handleApiError(error, 'Notifications PUT');
  }
}
