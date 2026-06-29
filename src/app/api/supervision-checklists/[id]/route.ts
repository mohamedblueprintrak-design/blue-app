import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, supervisionChecklistUpdateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const checklist = await db.supervisionChecklist.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true, organizationId: true } },
        items: { orderBy: { createdAt: "asc" } },
        violations: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!checklist || checklist.deletedAt) {
      return NextResponse.json({ error: "Supervision checklist not found" }, { status: 404 });
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, { organizationId: checklist.project?.organizationId });
    if (orgError) return orgError;

    return NextResponse.json(checklist);
  } catch (error) {
    log.error("Error fetching supervision checklist:", error);
    return NextResponse.json({ error: "Failed to fetch supervision checklist" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify checklist exists and check org access
    const existing = await db.supervisionChecklist.findUnique({
      where: { id },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supervision checklist not found" }, { status: 404 });
    }

    const orgError = orgCheck(user, { organizationId: existing.project?.organizationId });
    if (orgError) return orgError;

    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(supervisionChecklistUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const {
      stage, title, visitDate, engineerId, weather, temperature,
      workerCount, contractorName, progressOverall, notes, status, approvedById
    } = body;

    const checklist = await db.supervisionChecklist.update({
      where: { id },
      data: {
        ...(stage !== undefined && { stage }),
        ...(title !== undefined && { title }),
        ...(visitDate && { visitDate: new Date(visitDate) }),
        ...(engineerId !== undefined && { engineerId }),
        ...(weather !== undefined && { weather }),
        ...(temperature !== undefined && { temperature }),
        ...(workerCount !== undefined && { workerCount: parseInt(workerCount) || 0 }),
        ...(contractorName !== undefined && { contractorName }),
        ...(progressOverall !== undefined && { progressOverall: parseFloat(progressOverall) || 0 }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(approvedById !== undefined && { approvedById }),
      },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        items: true,
        violations: true,
      },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    log.error("Error updating supervision checklist:", error);
    return NextResponse.json({ error: "Failed to update supervision checklist" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_DELETE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify checklist exists and check org access
    const existing = await db.supervisionChecklist.findUnique({
      where: { id },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supervision checklist not found" }, { status: 404 });
    }

    const orgError = orgCheck(user, { organizationId: existing.project?.organizationId });
    if (orgError) return orgError;

    await db.supervisionChecklist.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting supervision checklist:", error);
    return NextResponse.json({ error: "Failed to delete supervision checklist" }, { status: 500 });
  }
}
