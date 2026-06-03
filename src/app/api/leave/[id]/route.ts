import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateIdParam, validateRequest, leaveUpdateSchema } from '@/lib/api-validation';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// GET /api/leave/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK - requires EMPLOYEE_READ permission
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const leave = await db.leave.findFirst({
      where: { id, deletedAt: null, user: { ...orgFilter(ctx) } },
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
        approver: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    return NextResponse.json(leave);
  } catch (error) {
    log.error("GET /api/leave/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch leave request" }, { status: 500 });
  }
}

// PUT /api/leave/[id] - approval/rejection requires HR access
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK - requires EMPLOYEE_UPDATE permission for approval/rejection
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify leave record belongs to user's org
    const existingLeave = await db.leave.findFirst({
      where: { id, user: { ...orgFilter(ctx) } },
    });
    if (!existingLeave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);

    // Zod validation for leave update fields
    const validation = validateRequest(leaveUpdateSchema, sanitizedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const validatedData = validation.data;

    const leave = await db.leave.update({
      where: { id },
      data: {
        ...(validatedData.type !== undefined && { type: validatedData.type }),
        ...(validatedData.startDate !== undefined && { startDate: new Date(validatedData.startDate) }),
        ...(validatedData.endDate !== undefined && { endDate: new Date(validatedData.endDate) }),
        ...(validatedData.days !== undefined && { days: validatedData.days }),
        ...(validatedData.reason !== undefined && { reason: validatedData.reason }),
        ...(validatedData.status !== undefined && { status: validatedData.status }),
        // Set approvedById server-side when status is APPROVED — never trust client-supplied value
        ...(validatedData.status === 'APPROVED' && { approvedById: ctx.userId }),
      },
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
        approver: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(leave);
  } catch (error) {
    log.error("PUT /api/leave/[id] error:", error);
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}

// DELETE /api/leave/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK - requires EMPLOYEE_UPDATE permission for deletion
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify leave record belongs to user's org
    const existingLeave = await db.leave.findFirst({
      where: { id, user: { ...orgFilter(ctx) } },
    });
    if (!existingLeave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    await db.leave.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("DELETE /api/leave/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete leave request" }, { status: 500 });
  }
}
