import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedPermission, orgFilter, orgCreate } from "@/app/api/utils/auth";
import { Permission } from "@/lib/auth/types";
import { log } from "@/lib/logger";
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// ============================================
// Validation Schemas
// ============================================

const timesheetEntrySchema = z.object({
  date: z.string(),
  hours: z.number().min(0).max(24),
  taskType: z.enum(["REGULAR", "OVERTIME", "HOLIDAY"]).optional().default("REGULAR"),
  description: z.string().optional().default(""),
  projectId: z.string().optional().nullable(),
});

const timesheetCreateSchema = z.object({
  employeeId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  weekStart: z.string(),
  weekEnd: z.string(),
  notes: z.string().optional().default(""),
  entries: z.array(timesheetEntrySchema).min(1),
});

// ============================================
// GET /api/timesheets - List timesheets with filters
// ============================================
export async function GET(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_READ);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const weekStart = searchParams.get("weekStart");

    const where: Record<string, unknown> = {
      deletedAt: null,
      employee: { ...orgFilter(ctx) },
    };

    if (employeeId && employeeId !== "all") {
      where.employeeId = employeeId;
    }
    if (projectId && projectId !== "all") {
      where.projectId = projectId;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (weekStart) {
      where.weekStart = new Date(weekStart);
    }

    const timesheets = await db.timesheet.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
            department: true,
            position: true,
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        approvedBy: {
          select: { id: true, name: true, avatar: true },
        },
        entries: {
          orderBy: { date: "asc" },
          include: {
            project: {
              select: { id: true, name: true, nameEn: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Summary stats
    const now = new Date();
    const startOfWeek = getMonday(now);
    const endOfWeek = getSunday(now);

    const [thisWeekHours, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      db.timesheet.aggregate({
        _sum: { totalHours: true },
        where: {
          weekStart: { gte: startOfWeek },
          weekEnd: { lte: endOfWeek },
          deletedAt: null,
          status: { in: ["SUBMITTED", "APPROVED"] },
          employee: { ...orgFilter(ctx) },
        },
      }),
      db.timesheet.count({ where: { status: "SUBMITTED", deletedAt: null, employee: { ...orgFilter(ctx) } } }),
      db.timesheet.count({ where: { status: "APPROVED", deletedAt: null, employee: { ...orgFilter(ctx) } } }),
      db.timesheet.count({ where: { status: "REJECTED", deletedAt: null, employee: { ...orgFilter(ctx) } } }),
    ]);

    const summary = {
      thisWeekHours: thisWeekHours._sum?.totalHours || 0,
      PENDING: pendingCount,
      APPROVED: approvedCount,
      REJECTED: rejectedCount,
    };

    return NextResponse.json({ timesheets, summary });
  } catch (error) {
    log.error("GET /api/timesheets error:", error);
    return NextResponse.json({ error: "Failed to fetch timesheets" }, { status: 500 });
  }
}

// ============================================
// POST /api/timesheets - Create new timesheet
// ============================================
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();
    const validation = timesheetCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { employeeId, projectId, weekStart, weekEnd, notes, entries } = validation.data;

    // Check for existing timesheet for this employee+week
    const existing = await db.timesheet.findUnique({
      where: { employeeId_weekStart: { employeeId, weekStart: new Date(weekStart) } },
    });
    if (existing && !existing.deletedAt) {
      return NextResponse.json(
        { error: "A timesheet already exists for this employee and week" },
        { status: 409 }
      );
    }

    // Calculate total hours
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

    const timesheet = await db.timesheet.create({
      data: {
        employeeId,
        projectId: projectId || null,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        totalHours,
        notes,
        status: "DRAFT",
        ...orgCreate(ctx),
        entries: {
          create: entries.map((entry) => ({
            date: new Date(entry.date),
            hours: entry.hours,
            taskType: entry.taskType || "regular",
            description: entry.description || "",
            projectId: entry.projectId || null,
          })),
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true, avatar: true } },
            department: true,
            position: true,
          },
        },
        project: { select: { id: true, name: true, nameEn: true } },
        entries: { orderBy: { date: "asc" } },
      },
    });

    return NextResponse.json(timesheet, { status: 201 });
  } catch (error) {
    log.error("POST /api/timesheets error:", error);
    return NextResponse.json({ error: "Failed to create timesheet" }, { status: 500 });
  }
}

// ============================================
// Helpers
// ============================================

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (7 - day);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
}
