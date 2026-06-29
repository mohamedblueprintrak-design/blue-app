import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateIdParam } from '@/lib/api-validation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireVerifiedPermission(request, Permission.RISK_UPDATE);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership through risk -> project chain
    const orgWhere = ctx.organizationId
      ? { risk: { project: { organizationId: ctx.organizationId } } }
      : process.env.MULTI_TENANT === 'true'
        ? { risk: { project: { organizationId: '__DENIED__' } } }
        : {};
    const action = await db.riskAction.findFirst({ where: { id, ...orgWhere } });

    if (!action) {
      return NextResponse.json({ error: "Risk action not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.description !== undefined) updateData.description = body.description;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.completed !== undefined) updateData.completed = Boolean(body.completed);

    const updated = await db.riskAction.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    log.error("Error updating risk action:", error);
    return NextResponse.json({ error: "Failed to update risk action" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireVerifiedPermission(request, Permission.RISK_DELETE);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership through risk -> project chain before delete
    const orgWhere = ctx.organizationId
      ? { risk: { project: { organizationId: ctx.organizationId } } }
      : process.env.MULTI_TENANT === 'true'
        ? { risk: { project: { organizationId: '__DENIED__' } } }
        : {};
    const action = await db.riskAction.findFirst({ where: { id, ...orgWhere } });
    if (!action) {
      return NextResponse.json({ error: "Risk action not found" }, { status: 404 });
    }

    await db.riskAction.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting risk action:", error);
    return NextResponse.json({ error: "Failed to delete risk action" }, { status: 500 });
  }
}
