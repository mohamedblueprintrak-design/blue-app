import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, commissionUpdateSchema } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.COMMISSION_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(commissionUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { status, approvedById, paidDate } = body;

    // Verify org ownership before update
    const orgWhere = { project: { ...orgFilter(ctx) } };
    const existing = await db.commission.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    const commission = await db.commission.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(approvedById !== undefined && { approvedById }),
        ...(paidDate !== undefined && { paidDate: paidDate ? new Date(paidDate) : null }),
        ...(status === "PAID" && !paidDate && { paidDate: new Date() }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(commission);
  } catch (error) {
    log.error("Error updating commission:", error);
    return NextResponse.json({ error: "Failed to update commission" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.COMMISSION_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = { project: { ...orgFilter(ctx) } };
    const existing = await db.commission.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    await db.commission.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting commission:", error);
    return NextResponse.json({ error: "Failed to delete commission" }, { status: 500 });
  }
}
