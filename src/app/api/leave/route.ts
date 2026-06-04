import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, leaveCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// GET /api/leave
export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK - requires EMPLOYEE_READ permission
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      deletedAt: null,
      employee: { ...orgFilter(ctx) },
    };

    if (employeeId && employeeId !== "all") {
      where.employeeId = employeeId;
    }
    if (status && status !== "all") {
      where.status = status;
    }

    const leaves = await db.leave.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, email: true, avatar: true } },
        approver: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Summary stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingCount, approvedThisMonth, onLeaveToday] = await Promise.all([
      db.leave.count({ where: { status: "PENDING", employee: { ...orgFilter(ctx) } } }),
      db.leave.count({
        where: {
          status: "APPROVED",
          startDate: { gte: startOfMonth },
          employee: { ...orgFilter(ctx) },
        },
      }),
      db.leave.count({
        where: {
          status: "APPROVED",
          startDate: { lte: today },
          endDate: { gte: today },
          employee: { ...orgFilter(ctx) },
        },
      }),
    ]);

    const summary = {
      PENDING: pendingCount,
      approvedThisMonth,
      onLeaveToday,
    };

    return NextResponse.json({ records: leaves, summary });
  } catch (error) {
    log.error("GET /api/leave error:", error);
    return NextResponse.json({ error: "Failed to fetch leave records" }, { status: 500 });
  }
}

// POST /api/leave
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK - requires EMPLOYEE_UPDATE permission
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();
    const validation = validateRequest(leaveCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const sanitizedBody = sanitizeObject(validation.data);

    const { employeeId, type, startDate, endDate, reason } = sanitizedBody;
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) || 1;

    const leave = await db.leave.create({
      data: {
        ...orgCreate(ctx),
        employeeId,
        type: type || "ANNUAL",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: days || 1,
        reason: reason || "",
        status: "PENDING",
      },
      include: {
        employee: { select: { id: true, name: true, email: true, avatar: true } },
        approver: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    log.error("POST /api/leave error:", error);
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
  }
}
