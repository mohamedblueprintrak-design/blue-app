import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateIdParam } from '@/lib/api-validation';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// GET /api/attendance/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.EMPLOYEE_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const attendance = await db.attendance.findFirst({
      where: { id, employee: { user: { ...orgFilter(ctx) } } },
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

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    log.error("GET /api/attendance/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance record" }, { status: 500 });
  }
}

// PUT /api/attendance/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify attendance record belongs to user's org
    const existing = await db.attendance.findFirst({
      where: { id, employee: { user: { ...orgFilter(ctx) } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);

    // Zod validation for attendance update fields
    const attendanceUpdateSchema = z.object({
      checkIn: z.string().max(50).optional(),
      checkOut: z.string().max(50).optional(),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY']).optional(),
      workHours: z.coerce.number().min(0).max(24).optional(),
      overtimeHours: z.coerce.number().min(0).max(24).optional(),
    });
    const validation = attendanceUpdateSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const validatedData = validation.data;

    const attendance = await db.attendance.update({
      where: { id },
      data: {
        ...(validatedData.checkIn !== undefined && { checkIn: validatedData.checkIn }),
        ...(validatedData.checkOut !== undefined && { checkOut: validatedData.checkOut }),
        ...(validatedData.status !== undefined && { status: validatedData.status as any }), // eslint-disable-line @typescript-eslint/no-explicit-any
        ...(validatedData.workHours !== undefined && { workHours: validatedData.workHours }),
        ...(validatedData.overtimeHours !== undefined && { overtimeHours: validatedData.overtimeHours }),
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

    return NextResponse.json(attendance);
  } catch (error) {
    log.error("PUT /api/attendance/[id] error:", error);
    return NextResponse.json({ error: "Failed to update attendance record" }, { status: 500 });
  }
}

// DELETE /api/attendance/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.EMPLOYEE_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify attendance record belongs to user's org
    const existing = await db.attendance.findFirst({
      where: { id, employee: { user: { ...orgFilter(ctx) } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    await db.attendance.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("DELETE /api/attendance/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete attendance record" }, { status: 500 });
  }
}
