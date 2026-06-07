import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedAuth, orgCreate } from '@/app/api/utils/auth';
import { handleApiError } from '@/lib/api-error';
import { z } from 'zod';

// ── Default structures ─────────────────────────────────────────────────────

const DEFAULT_CHANNELS = {
  inApp: true,
  email: true,
  push: true,
};

const DEFAULT_CATEGORIES = {
  invoices: { created: true, paid: true, overdue: true },
  tasks: { assigned: true, due_soon: true, overdue: true, completed: true },
  projects: { created: true, status_change: true },
  approvals: { pending: true, approved: true, rejected: true },
  documents: { uploaded: true, signed: true },
  comments: { mentioned: true, replied: true },
  system: { security_alerts: true, billing: true },
};

const DEFAULT_QUIET_HOURS = {
  enabled: false,
  start: '22:00',
  end: '08:00',
  timezone: 'Asia/Dubai',
};

// ── Validation schemas ─────────────────────────────────────────────────────

const booleanSchema = z.boolean().optional();
const channelsSchema = z.object({
  inApp: booleanSchema,
  email: booleanSchema,
  push: booleanSchema,
}).optional();

const categoryEventsSchema = z.record(z.string(), z.boolean()).optional();
const categoriesSchema = z.object({
  invoices: categoryEventsSchema,
  tasks: categoryEventsSchema,
  projects: categoryEventsSchema,
  approvals: categoryEventsSchema,
  documents: categoryEventsSchema,
  comments: categoryEventsSchema,
  system: categoryEventsSchema,
}).optional();

const quietHoursSchema = z.object({
  enabled: z.boolean().optional(),
  start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().max(100).optional(),
}).optional();

// Legacy boolean fields + new granular fields
const updateSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  taskAssigned: z.boolean().optional(),
  taskDueSoon: z.boolean().optional(),
  taskOverdue: z.boolean().optional(),
  invoiceOverdue: z.boolean().optional(),
  projectUpdates: z.boolean().optional(),
  slaWarnings: z.boolean().optional(),
  channels: channelsSchema,
  categories: categoriesSchema,
  quietHours: quietHoursSchema,
});

// ── Helpers ────────────────────────────────────────────────────────────────

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
}

// ── GET /api/settings/notifications ────────────────────────────────────────

/**
 * Get notification preferences for the current user.
 * Returns both legacy boolean fields and granular channel/category/quietHours.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const settings = await db.notificationSettings.findUnique({
      where: { userId: ctx.userId },
    });

    if (!settings) {
      // Return defaults — no row exists yet
      return NextResponse.json({
        emailNotifications: true,
        pushNotifications: true,
        taskAssigned: true,
        taskDueSoon: true,
        taskOverdue: true,
        invoiceOverdue: true,
        projectUpdates: true,
        slaWarnings: true,
      });
    }

    return NextResponse.json({
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      taskAssigned: settings.taskAssigned,
      taskDueSoon: settings.taskDueSoon,
      taskOverdue: settings.taskOverdue,
      invoiceOverdue: settings.invoiceOverdue,
      projectUpdates: settings.projectUpdates,
      slaWarnings: settings.slaWarnings,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'NotificationSettings GET');
  }
}

// ── PUT /api/settings/notifications ────────────────────────────────────────

/**
 * Update notification preferences for the current user.
 * Validates JSON structure and upserts the row.
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const rawBody = await request.json();
    const validation = updateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Merge with existing settings for JSON fields
    const existing = await db.notificationSettings.findUnique({
      where: { userId: ctx.userId },
    });



    const orgData = orgCreate(ctx);

    const settings = await db.notificationSettings.upsert({
      where: { userId: ctx.userId },
      update: {
        ...(data.emailNotifications !== undefined && { emailNotifications: data.emailNotifications }),
        ...(data.pushNotifications !== undefined && { pushNotifications: data.pushNotifications }),
        ...(data.taskAssigned !== undefined && { taskAssigned: data.taskAssigned }),
        ...(data.taskDueSoon !== undefined && { taskDueSoon: data.taskDueSoon }),
        ...(data.taskOverdue !== undefined && { taskOverdue: data.taskOverdue }),
        ...(data.invoiceOverdue !== undefined && { invoiceOverdue: data.invoiceOverdue }),
        ...(data.projectUpdates !== undefined && { projectUpdates: data.projectUpdates }),
        ...(data.slaWarnings !== undefined && { slaWarnings: data.slaWarnings }),
      },
      create: {
        userId: ctx.userId,
        emailNotifications: data.emailNotifications ?? true,
        pushNotifications: data.pushNotifications ?? true,
        taskAssigned: data.taskAssigned ?? true,
        taskDueSoon: data.taskDueSoon ?? true,
        taskOverdue: data.taskOverdue ?? true,
        invoiceOverdue: data.invoiceOverdue ?? true,
        projectUpdates: data.projectUpdates ?? true,
        slaWarnings: data.slaWarnings ?? true,
        ...orgData,
      },
    });

    return NextResponse.json({
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      taskAssigned: settings.taskAssigned,
      taskDueSoon: settings.taskDueSoon,
      taskOverdue: settings.taskOverdue,
      invoiceOverdue: settings.invoiceOverdue,
      projectUpdates: settings.projectUpdates,
      slaWarnings: settings.slaWarnings,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'NotificationSettings PUT');
  }
}
