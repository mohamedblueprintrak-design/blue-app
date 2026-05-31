import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, submittalUpdateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUBMITTAL_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const submittal = await db.submittal.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    if (!submittal) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    return NextResponse.json(submittal);
  } catch (error) {
    log.error("Error fetching submittal:", error);
    return NextResponse.json({ error: "Failed to fetch submittal" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUBMITTAL_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before update
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.submittal.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(submittalUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { number, title, type, contractor, revisionNumber, status } = body;

    const submittal = await db.submittal.update({
      where: { id },
      data: {
        ...(number !== undefined && { number }),
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(contractor !== undefined && { contractor }),
        ...(revisionNumber !== undefined && { revisionNumber: parseInt(revisionNumber) || 1 }),
        ...(status !== undefined && { status }),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(submittal);
  } catch (error) {
    log.error("Error updating submittal:", error);
    return NextResponse.json({ error: "Failed to update submittal" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUBMITTAL_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.submittal.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    await db.submittal.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting submittal:", error);
    return NextResponse.json({ error: "Failed to delete submittal" }, { status: 500 });
  }
}
