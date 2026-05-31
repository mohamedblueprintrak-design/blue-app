import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, transmittalUpdateSchema } from '@/lib/api-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK - requires DOCUMENT_READ permission
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const transmittal = await db.transmittal.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        from: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!transmittal) {
      return NextResponse.json({ error: "Transmittal not found" }, { status: 404 });
    }

    return NextResponse.json(transmittal);
  } catch (error) {
    log.error("Error fetching transmittal:", error);
    return NextResponse.json({ error: "Failed to fetch transmittal" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK - requires DOCUMENT_UPDATE permission
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before update
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.transmittal.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Transmittal not found" }, { status: 404 });
    }

    const body = await request.json();

    // Zod validation for update fields
    const validation = validateRequest(transmittalUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const transmittal = await db.transmittal.update({
      where: { id },
      data: {
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.toName !== undefined && { toName: body.toName }),
        ...(body.toEmail !== undefined && { toEmail: body.toEmail }),
        ...(body.toCompany !== undefined && { toCompany: body.toCompany }),
        ...(body.toPhone !== undefined && { toPhone: body.toPhone }),
        ...(body.deliveryMethod !== undefined && { deliveryMethod: body.deliveryMethod }),
        ...(body.status !== undefined && { status: body.status }),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        from: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
    });

    return NextResponse.json(transmittal);
  } catch (error) {
    log.error("Error updating transmittal:", error);
    return NextResponse.json({ error: "Failed to update transmittal" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK - requires DOCUMENT_DELETE permission
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.transmittal.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Transmittal not found" }, { status: 404 });
    }

    await db.transmittal.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting transmittal:", error);
    return NextResponse.json({ error: "Failed to delete transmittal" }, { status: 500 });
  }
}
