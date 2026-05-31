import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, designPhaseUpdateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const orgWhere = { ...orgFilterNested(ctx, 'project'), deletedAt: null };
    const phase = await db.designPhase.findFirst({
      where: { id, ...orgWhere },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        drawings: {
          include: {
            revisions: {
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!phase) {
      return NextResponse.json({ error: "Design phase not found" }, { status: 404 });
    }

    return NextResponse.json(phase);
  } catch (error) {
    log.error("Error fetching design phase:", error);
    return NextResponse.json({ error: "Failed to fetch design phase" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before update
    const orgWhere = { ...orgFilterNested(ctx, 'project'), deletedAt: null };
    const existing = await db.designPhase.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Design phase not found" }, { status: 404 });
    }

    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(designPhaseUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { phase, phaseNameAr, phaseNameEn, status, designerId, startDate, dueDate, completedDate, revisionCount, notes, clientApproval } = body;

    const phaseData: Record<string, unknown> = {};
    if (phase !== undefined) phaseData.phase = phase;
    if (phaseNameAr !== undefined) phaseData.phaseNameAr = phaseNameAr;
    if (phaseNameEn !== undefined) phaseData.phaseNameEn = phaseNameEn;
    if (status !== undefined) phaseData.status = status;
    if (designerId !== undefined) phaseData.designerId = designerId || null;
    if (startDate !== undefined) phaseData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) phaseData.dueDate = dueDate ? new Date(dueDate) : null;
    if (completedDate !== undefined) phaseData.completedDate = completedDate ? new Date(completedDate) : null;
    if (revisionCount !== undefined) phaseData.revisionCount = revisionCount;
    if (notes !== undefined) phaseData.notes = notes;
    if (clientApproval !== undefined) phaseData.clientApproval = clientApproval;

    const updatedPhase = await db.designPhase.update({
      where: { id },
      data: phaseData,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        drawings: {
          select: { id: true, status: true, clashDetected: true },
        },
      },
    });

    return NextResponse.json(updatedPhase);
  } catch (error) {
    log.error("Error updating design phase:", error);
    return NextResponse.json({ error: "Failed to update design phase" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = { ...orgFilterNested(ctx, 'project'), deletedAt: null };
    const existing = await db.designPhase.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Design phase not found" }, { status: 404 });
    }

    await db.designPhase.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting design phase:", error);
    return NextResponse.json({ error: "Failed to delete design phase" }, { status: 500 });
  }
}
