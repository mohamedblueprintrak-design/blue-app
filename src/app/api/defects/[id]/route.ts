import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, defectUpdateSchema } from '@/lib/api-validation';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DEFECT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const defect = await db.defect.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    if (!defect) {
      return NextResponse.json({ error: "Defect not found" }, { status: 404 });
    }

    return NextResponse.json(defect);
  } catch (error) {
    log.error("Error fetching defect:", error);
    return NextResponse.json({ error: "Failed to fetch defect" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DEFECT_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    const validation = validateRequest(defectUpdateSchema, body);
    // Zod validation for update fields
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const sanitizedBody = sanitizeObject(validation.data);
    const { title, severity, location, assigneeId, photos, resolutionNotes, status } = sanitizedBody;

    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.defect.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Defect not found" }, { status: 404 });
    }

    const defect = await db.defect.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(severity !== undefined && { severity }),
        ...(location !== undefined && { location }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(photos !== undefined && { photos }),
        ...(resolutionNotes !== undefined && { resolutionNotes }),
        ...(status !== undefined && { status }),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    return NextResponse.json(defect);
  } catch (error) {
    log.error("Error updating defect:", error);
    return NextResponse.json({ error: "Failed to update defect" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DEFECT_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.defect.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Defect not found" }, { status: 404 });
    }
    await db.defect.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting defect:", error);
    return NextResponse.json({ error: "Failed to delete defect" }, { status: 500 });
  }
}
