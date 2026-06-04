import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, documentUpdateSchema } from '@/lib/api-validation';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const document = await db.document.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        contract: { select: { id: true, number: true, title: true } },
        uploader: { select: { id: true, name: true, avatar: true, email: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    log.error("Error fetching document:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before update
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.document.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateRequest(documentUpdateSchema, body);

    // Zod validation for document update fields
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const sanitizedBody = sanitizeObject(validation.data);

    const validatedData = validation.data;

    const document = await db.document.update({
      where: { id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.fileType !== undefined && { fileType: validatedData.fileType }),
        ...(validatedData.fileSize !== undefined && { fileSize: validatedData.fileSize }),
        ...(validatedData.category !== undefined && { category: validatedData.category }),
        ...(validatedData.version !== undefined && { version: validatedData.version }),
        ...(validatedData.projectId !== undefined && { projectId: validatedData.projectId || null }),
        ...(validatedData.contractId !== undefined && { contractId: validatedData.contractId || null }),
      },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        contract: { select: { id: true, number: true, title: true } },
        uploader: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    log.error("Error updating document:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.document.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await db.document.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
