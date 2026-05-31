import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, marketingCampaignUpdateSchema } from '@/lib/api-validation';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(marketingCampaignUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { name, type, budget, spent, leads, conversions, startDate, endDate, status, notes } = body;

    // SECURITY: Verify the campaign belongs to the user's organization
    const existing = await db.marketingCampaign.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaign = await db.marketingCampaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(budget !== undefined && { budget: parseFloat(String(budget)) }),
        ...(spent !== undefined && { spent: parseFloat(String(spent)) }),
        ...(leads !== undefined && { leads: parseInt(String(leads)) }),
        ...(conversions !== undefined && { conversions: parseInt(String(conversions)) }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    log.error("Error updating marketing campaign:", error);
    return NextResponse.json({ error: "Failed to update marketing campaign" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Verify the campaign belongs to the user's organization
    const existing = await db.marketingCampaign.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await db.marketingCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting marketing campaign:", error);
    return NextResponse.json({ error: "Failed to delete marketing campaign" }, { status: 500 });
  }
}
