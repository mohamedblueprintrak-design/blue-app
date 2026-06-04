import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, riskUpdateSchema } from '@/lib/api-validation';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.RISK_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const risk = await db.risk.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        actions: {
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!risk) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }

    return NextResponse.json(risk);
  } catch (error) {
    log.error("Error fetching risk:", error);
    return NextResponse.json({ error: "Failed to fetch risk" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.RISK_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    const validation = validateRequest(riskUpdateSchema, body);

   // Zod validation for update fields

   
    if (!validation.success) {

     return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const sanitizedBody = sanitizeObject(validation.data);

    // Verify org ownership before update
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.risk.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }

    // SECURITY FIX: Use validated data (validation.data) instead of raw body.
    // Previously, body.* was used directly, completely bypassing Zod validation.
    const validated = validation.data;

    const updateData: Record<string, unknown> = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.probability !== undefined) updateData.probability = validated.probability;
    if (validated.impact !== undefined) updateData.impact = validated.impact;
    if (validated.mitigationPlan !== undefined) updateData.mitigationPlan = validated.mitigationPlan;
    if (validated.strategy !== undefined) updateData.strategy = validated.strategy;
    if (validated.status !== undefined) updateData.status = validated.status;

    // Auto-calculate score using validated values
    if (validated.probability !== undefined || validated.impact !== undefined) {
      const p = validated.probability !== undefined ? validated.probability : existing.probability;
      const i = validated.impact !== undefined ? validated.impact : existing.impact;
      updateData.score = p * i;
    }

    const risk = await db.risk.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        actions: {
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(risk);
  } catch (error) {
    log.error("Error updating risk:", error);
    return NextResponse.json({ error: "Failed to update risk" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.RISK_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.risk.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }

    await db.risk.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting risk:", error);
    return NextResponse.json({ error: "Failed to delete risk" }, { status: 500 });
  }
}
