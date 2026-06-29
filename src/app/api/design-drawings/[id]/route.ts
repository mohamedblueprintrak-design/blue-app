import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, designDrawingUpdateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const drawing = await db.designDrawing.findUnique({
      where: { id },
      include: {
        designPhase: {
          select: {
            id: true,
            phase: true,
            phaseNameAr: true,
            phaseNameEn: true,
            project: {
              select: { id: true, name: true, nameEn: true, number: true, organizationId: true },
            },
          },
        },
        revisions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!drawing || drawing.deletedAt) {
      return NextResponse.json({ error: "Design drawing not found" }, { status: 404 });
    }

    // Multi-tenancy: check org access via project
    const orgError = orgCheck(user, { organizationId: drawing.designPhase?.project?.organizationId });
    if (orgError) return orgError;

    return NextResponse.json(drawing);
  } catch (error) {
    log.error("Error fetching design drawing:", error);
    return NextResponse.json({ error: "Failed to fetch design drawing" }, { status: 500 });
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

    // Verify drawing exists and check org access
    const existing = await db.designDrawing.findUnique({
      where: { id },
      include: {
        designPhase: {
          select: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Design drawing not found" }, { status: 404 });
    }

    const orgError = orgCheck(user, { organizationId: existing.designPhase?.project?.organizationId });
    if (orgError) return orgError;

    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(designDrawingUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { title, drawingNumber, discipline, version, filePath, fileSize, status, reviewedBy, reviewNotes, reviewedAt, clashDetected, clashNotes } = body;

    const drawData: Record<string, unknown> = {};
    if (title !== undefined) drawData.title = title;
    if (drawingNumber !== undefined) drawData.drawingNumber = drawingNumber;
    if (discipline !== undefined) drawData.discipline = discipline;
    if (version !== undefined) drawData.version = parseInt(version) || 1;
    if (filePath !== undefined) drawData.filePath = filePath;
    if (fileSize !== undefined) drawData.fileSize = fileSize;
    if (status !== undefined) drawData.status = status;
    if (reviewedBy !== undefined) drawData.reviewedBy = reviewedBy || null;
    if (reviewNotes !== undefined) drawData.reviewNotes = reviewNotes;
    if (reviewedAt !== undefined) drawData.reviewedAt = reviewedAt ? new Date(reviewedAt) : null;
    if (clashDetected !== undefined) drawData.clashDetected = clashDetected;
    if (clashNotes !== undefined) drawData.clashNotes = clashNotes;

    const updatedDrawing = await db.designDrawing.update({
      where: { id },
      data: drawData,
      include: {
        designPhase: {
          select: { id: true, phase: true, phaseNameAr: true, phaseNameEn: true },
        },
        revisions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(updatedDrawing);
  } catch (error) {
    log.error("Error updating design drawing:", error);
    return NextResponse.json({ error: "Failed to update design drawing" }, { status: 500 });
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

    // Verify drawing exists and check org access
    const existing = await db.designDrawing.findUnique({
      where: { id },
      include: {
        designPhase: {
          select: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Design drawing not found" }, { status: 404 });
    }

    const orgError = orgCheck(user, { organizationId: existing.designPhase?.project?.organizationId });
    if (orgError) return orgError;

    await db.designDrawing.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting design drawing:", error);
    return NextResponse.json({ error: "Failed to delete design drawing" }, { status: 500 });
  }
}
