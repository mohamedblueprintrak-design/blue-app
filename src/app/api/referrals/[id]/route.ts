import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { orgFilter, requireVerifiedPermission } from '../../utils/auth';
import { validateRequest, validateIdParam, referralUpdateSchema } from '@/lib/api-validation';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rbac = await requireVerifiedPermission(request, Permission.CLIENT_UPDATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  try {
    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(referralUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { status, discountGiven, rewardAmount, notes } = body;

    // SECURITY: Verify the referral belongs to the user's organization
    const existing = await db.referral.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    const referral = await db.referral.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(discountGiven !== undefined && { discountGiven: parseFloat(String(discountGiven)) }),
        ...(rewardAmount !== undefined && { rewardAmount: parseFloat(String(rewardAmount)) }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        referrer: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    return NextResponse.json(referral);
  } catch (error) {
    log.error("Error updating referral:", error);
    return NextResponse.json({ error: "Failed to update referral" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rbac = await requireVerifiedPermission(request, Permission.CLIENT_DELETE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  try {
    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Verify the referral belongs to the user's organization
    const existing = await db.referral.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    await db.referral.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting referral:", error);
    return NextResponse.json({ error: "Failed to delete referral" }, { status: 500 });
  }
}
