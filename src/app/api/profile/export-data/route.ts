import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { logAudit } from '@/lib/services/audit.service';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * GET /api/profile/export-data
 *
 * Exports all data associated with the authenticated user as a JSON file.
 * Rate limited to 1 export per hour to prevent abuse.
 *
 * Collected data sections:
 *  - Profile (name, email, phone, role, etc.)
 *  - Projects (created or assigned to)
 *  - Tasks assigned to the user
 *  - Invoices created by the user
 *  - Documents uploaded by the user
 *  - Activity log entries
 *  - Notifications
 */
export async function GET(request: NextRequest) {
  try {
    // ── Authentication ──────────────────────────────────────────────
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    // ── Rate Limiting: 1 export per hour ────────────────────────────
    const { result: rateLimitResult } = await withRateLimit(request, 'export');
    const rlBlocked = rateLimitResponse(rateLimitResult);
    if (rlBlocked) return rlBlocked;

    // ── Collect User Data ───────────────────────────────────────────

    // 1. User profile
    const userProfile = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        avatar: true,
        isActive: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        organizationId: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // 2. Projects the user created
    const createdProjects = await db.project.findMany({
      where: { createdById: userId, deletedAt: null },
      select: {
        id: true,
        number: true,
        name: true,
        nameEn: true,
        status: true,
        progress: true,
        budget: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });

    // Projects the user is assigned to
    const assignedProjectRecords = await db.projectAssignment.findMany({
      where: { userId },
      select: {
        role: true,
        project: {
          select: {
            id: true,
            number: true,
            name: true,
            nameEn: true,
            status: true,
            progress: true,
            budget: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
        },
      },
    });

    const assignedProjects = assignedProjectRecords.map((a) => ({
      assignmentRole: a.role,
      ...a.project,
    }));

    // 3. Tasks assigned to the user
    const tasks = await db.task.findMany({
      where: { assigneeId: userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        titleAr: true,
        description: true,
        priority: true,
        status: true,
        progress: true,
        startDate: true,
        dueDate: true,
        endDate: true,
        taskType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 4. Invoices created by the user
    const invoices = await db.invoice.findMany({
      where: { createdById: userId, deletedAt: null },
      select: {
        id: true,
        number: true,
        status: true,
        subtotal: true,
        tax: true,
        total: true,
        paidAmount: true,
        issueDate: true,
        dueDate: true,
        createdAt: true,
      },
    });

    // 5. Documents uploaded by the user
    const documents = await db.document.findMany({
      where: { uploadedById: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        fileType: true,
        fileSize: true,
        category: true,
        version: true,
        createdAt: true,
      },
    });

    // 6. Activity log entries
    const activityLogs = await db.activityLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit to most recent 500 entries
    });

    // 7. Notifications
    const notifications = await db.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        titleEn: true,
        message: true,
        messageEn: true,
        priority: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // Limit to most recent 200
    });

    // ── Assemble Export Data ────────────────────────────────────────
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        userId: userProfile.id,
        format: 'blueprint-data-export-v1',
      },
      profile: userProfile,
      projects: {
        created: createdProjects,
        assigned: assignedProjects,
      },
      tasks,
      invoices,
      documents,
      activityLogs,
      notifications,
    };

    // ── Log the export in ActivityLog ───────────────────────────────
    await logAudit({
      userId,
      organizationId: userProfile.organizationId ?? undefined,
      entityType: 'user',
      entityId: userId,
      action: 'export_data',
      description: 'User exported their data',
    });

    log.info('User exported their data', { userId });

    // ── Return as downloadable JSON ─────────────────────────────────
    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `blueprint-data-${userId}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    log.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تصدير البيانات' },
      { status: 500 }
    );
  }
}
