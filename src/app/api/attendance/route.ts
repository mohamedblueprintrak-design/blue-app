import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// Zod schema for attendance creation
const attendanceCreateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(100),
  date: z.string().min(1, 'Date is required'),
  checkIn: z.string().max(50).optional().default(''),
  checkOut: z.string().max(50).optional().default(''),
  status: z.enum([ 'PRESENT',  'ABSENT',  'LATE',  'LEAVE', 'HOLIDAY']).default( 'PRESENT'),
  workHours: z.coerce.number().min(0).max(24).optional().default(0),
  overtimeHours: z.coerce.number().min(0).max(24).optional().default(0),
});

// GET /api/attendance
export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.EMPLOYEE_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {
      deletedAt: null,
      employee: { user: { ...orgFilter(ctx) } },
    };

    if (employeeId && employeeId !== "all") {
      where.employeeId = employeeId;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.date as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    const attendance = await db.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }],
    });

    // Summary stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRecords = await db.attendance.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        employee: { user: { ...orgFilter(ctx) } },
      },
    });

    const summary = {
      PRESENT: todayRecords.filter((r) => r.status === "PRESENT").length,
      ABSENT: todayRecords.filter((r) => r.status === "ABSENT").length,
      LATE: todayRecords.filter((r) => r.status === "LATE").length,
      LEAVE: todayRecords.filter((r) => r.status === "LEAVE").length,
      totalEmployees: await db.employee.count({ where: { user: { ...orgFilter(ctx) } } }),
    };

    return NextResponse.json({ records: attendance, summary });
  } catch (error) {
    log.error("GET /api/attendance error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

// POST /api/attendance
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ('error' in result) return result.error;
    const _ctx = result.user;

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    // Zod validation for attendance fields
    const validation = attendanceCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { employeeId, date, checkIn, checkOut, status, workHours, overtimeHours } = validation.data;

    // Check for existing record
    const existing = await db.attendance.findFirst({
      where: {
        employeeId,
        date: new Date(date),
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Attendance record already exists for this employee and date" }, { status: 400 });
    }

    const ctx = result.user;
    const attendance = await db.attendance.create({
      data: {
        ...orgCreate(ctx),
        employeeId,
        date: new Date(date),
        checkIn: checkIn || "",
        checkOut: checkOut || "",
        status: (status || "PRESENT") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        workHours: workHours || 0,
        overtimeHours: overtimeHours || 0,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    log.error("POST /api/attendance error:", error);
    return NextResponse.json({ error: "Failed to create attendance record" }, { status: 500 });
  }
}
