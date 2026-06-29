import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, transmittalItemUpdateSchema } from '@/lib/api-validation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();

   // Zod validation for update fields

   const validation = validateRequest(transmittalItemUpdateSchema, body);

   if (!validation.success) {

     return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });

   }

    // Multi-tenancy: check org access via project chain
    const item = await db.transmittalItem.findUnique({
      where: { id },
      include: {
        transmittal: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Transmittal item not found" }, { status: 404 });
    }
    const orgError = orgCheck(user, { organizationId: item.transmittal.project?.organizationId });
    if (orgError) return orgError;

    const updateData: Record<string, unknown> = {};
    if (body.received !== undefined) updateData.received = Boolean(body.received);
    if (body.approved !== undefined) updateData.approved = Boolean(body.approved);
    if (body.rejected !== undefined) updateData.rejected = Boolean(body.rejected);
    if (body.needsRevision !== undefined) updateData.needsRevision = Boolean(body.needsRevision);
    if (body.replyNotes !== undefined) updateData.replyNotes = body.replyNotes;
    if (body.documentNumber !== undefined) updateData.documentNumber = body.documentNumber;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.revision !== undefined) updateData.revision = body.revision;
    if (body.copies !== undefined) updateData.copies = Number(body.copies);
    if (body.purpose !== undefined) updateData.purpose = body.purpose;

    const updated = await db.transmittalItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    log.error("Error updating transmittal item:", error);
    return NextResponse.json({ error: "Failed to update transmittal item" }, { status: 500 });
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
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Multi-tenancy: check org access via project chain
    const item = await db.transmittalItem.findUnique({
      where: { id },
      include: {
        transmittal: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Transmittal item not found" }, { status: 404 });
    }
    const orgError = orgCheck(user, { organizationId: item.transmittal.project?.organizationId });
    if (orgError) return orgError;

    await db.transmittalItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting transmittal item:", error);
    return NextResponse.json({ error: "Failed to delete transmittal item" }, { status: 500 });
  }
}
