import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, siteDiaryUpdateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SITE_DIARY_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const siteDiary = await db.siteDiary.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    if (!siteDiary) {
      return NextResponse.json({ error: "Site diary not found" }, { status: 404 });
    }

    return NextResponse.json(siteDiary);
  } catch (error) {
    log.error("Error fetching site diary:", error);
    return NextResponse.json({ error: "Failed to fetch site diary" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SITE_DIARY_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before update
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.siteDiary.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Site diary not found" }, { status: 404 });
    }

    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(siteDiaryUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { date, weather, workerCount, workDescription, issues, safetyNotes, equipment, materials, photos } = body;

    const siteDiary = await db.siteDiary.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(weather !== undefined && { weather }),
        ...(workerCount !== undefined && { workerCount: parseInt(workerCount) || 0 }),
        ...(workDescription !== undefined && { workDescription }),
        ...(issues !== undefined && { issues }),
        ...(safetyNotes !== undefined && { safetyNotes }),
        ...(equipment !== undefined && { equipment }),
        ...(materials !== undefined && { materials }),
        ...(photos !== undefined && { photos }),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(siteDiary);
  } catch (error) {
    log.error("Error updating site diary:", error);
    return NextResponse.json({ error: "Failed to update site diary" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SITE_DIARY_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.siteDiary.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Site diary not found" }, { status: 404 });
    }

    await db.siteDiary.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting site diary:", error);
    return NextResponse.json({ error: "Failed to delete site diary" }, { status: 500 });
  }
}
