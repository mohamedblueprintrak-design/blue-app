import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedPermission, orgFilter, canApproveLeave } from "@/app/api/utils/auth";
import { Permission } from "@/lib/auth/types";
import { log } from "@/lib/logger";
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// ============================================
// Validation Schemas
// ============================================

const timesheetUpdateSchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
  projectId: z.string().optional().nullable(),
  notes: z.string().optional(),
  rejectedReason: z.string().optional(),
});

// ============================================
// GET /api/timesheets/[id] - Get timesheet with entries
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_READ);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;
    const { id } = await params;

    const timesheet = await db.timesheet.findFirst({
      where: { id, deletedAt: null, employee: { ...orgFilter(ctx) } },
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
    });

    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    return NextResponse.json(timesheet);
  } catch (error) {
    log.error("GET /api/timesheets/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch timesheet" }, { status: 500 });
  }
}

// ============================================
// PUT /api/timesheets/[id] - Update timesheet
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;
    const { id } = await params;

    const existing = await db.timesheet.findFirst({
      where: { id, deletedAt: null, employee: { ...orgFilter(ctx) } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = timesheetUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    // Handle status transitions
    if (data.status) {
      if (data.status === "SUBMITTED") {
        // Submit: draft -> submitted
        if (existing.status !== "DRAFT") {
          return NextResponse.json(
            { error: "Only draft timesheets can be submitted" },
            { status: 400 }
          );
        }
        updateData.status = "SUBMITTED";
        updateData.submittedAt = new Date();
      } else if (data.status === "APPROVED") {
        // Approve: submitted -> approved (requires manager/admin)
        if (existing.status !== "SUBMITTED") {
          return NextResponse.json(
            { error: "Only submitted timesheets can be approved" },
            { status: 400 }
          );
        }
        if (!canApproveLeave(ctx.role)) {
          return NextResponse.json(
            { error: "Insufficient permissions to approve timesheets" },
            { status: 403 }
          );
        }
        updateData.status = "APPROVED";
        updateData.approvedById = ctx.userId;
        updateData.approvedAt = new Date();
        updateData.rejectedReason = null;
      } else if (data.status === "REJECTED") {
        // Reject: submitted -> rejected (requires manager/admin)
        if (existing.status !== "SUBMITTED") {
          return NextResponse.json(
            { error: "Only submitted timesheets can be rejected" },
            { status: 400 }
          );
        }
        if (!canApproveLeave(ctx.role)) {
          return NextResponse.json(
            { error: "Insufficient permissions to reject timesheets" },
            { status: 403 }
          );
        }
        updateData.status = "REJECTED";
        updateData.approvedById = ctx.userId;
        updateData.approvedAt = new Date();
        updateData.rejectedReason = data.rejectedReason || "";
      } else if (data.status === "DRAFT") {
        // Revert to draft: rejected -> draft
        if (existing.status !== "REJECTED") {
          return NextResponse.json(
            { error: "Only rejected timesheets can be reverted to draft" },
            { status: 400 }
          );
        }
        updateData.status = "DRAFT";
        updateData.approvedById = null;
        updateData.approvedAt = null;
        updateData.rejectedReason = null;
      }
    }

    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.projectId !== undefined) updateData.projectId = data.projectId || null;

    const timesheet = await db.timesheet.update({
      where: { id },
      data: updateData,
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
        approvedBy: { select: { id: true, name: true, avatar: true } },
        entries: { orderBy: { date: "asc" } },
      },
    });

    return NextResponse.json(timesheet);
  } catch (error) {
    log.error("PUT /api/timesheets/[id] error:", error);
    return NextResponse.json({ error: "Failed to update timesheet" }, { status: 500 });
  }
}

// ============================================
// DELETE /api/timesheets/[id] - Soft delete
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;
    const { id } = await params;

    const existing = await db.timesheet.findFirst({
      where: { id, deletedAt: null, employee: { ...orgFilter(ctx) } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    // Only draft or rejected timesheets can be deleted
    if (existing.status === "SUBMITTED" || existing.status === "APPROVED") {
      return NextResponse.json(
        { error: "Cannot delete submitted or approved timesheets" },
        { status: 400 }
      );
    }

    await db.timesheet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("DELETE /api/timesheets/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete timesheet" }, { status: 500 });
  }
}
