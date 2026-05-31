import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for progress claim update
const progressClaimUpdateSchema = z.object({
  projectId: z.string().max(100).optional(),
  claimNumber: z.string().max(50).optional(),
  period: z.string().max(100).optional(),
  claimDate: z.string().optional(),
  totalClaimAmount: z.coerce.number().min(0).max(999999999).optional(),
  approvedAmount: z.coerce.number().min(0).max(999999999).optional(),
  previousCertified: z.coerce.number().min(0).max(999999999).optional(),
  currentCertified: z.coerce.number().min(0).max(999999999).optional(),
  retentionAmount: z.coerce.number().min(0).max(999999999).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'CERTIFIED', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  certifiedAmount: z.coerce.number().min(0).max(999999999).optional(),
  certifiedDate: z.string().optional(),
  certifiedById: z.string().max(100).optional(),
  remarks: z.string().max(5000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    const progressClaim = await db.progressClaim.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    if (!progressClaim) {
      return NextResponse.json({ error: "Progress claim not found" }, { status: 404 });
    }

    return NextResponse.json(progressClaim);
  } catch (error) {
    log.error("Error fetching progress claim:", error);
    return NextResponse.json({ error: "Failed to fetch progress claim" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;
    const rawBody = await request.json();

    // Zod validation for progress claim update
    const validation = progressClaimUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const body = validation.data;

    const existing = await db.progressClaim.findFirst({
      where: { id, ...orgFilter(ctx) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Progress claim not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.claimNumber !== undefined) updateData.claimNumber = body.claimNumber;
    if (body.period !== undefined) updateData.period = body.period;
    if (body.claimDate !== undefined) updateData.claimDate = body.claimDate ? new Date(body.claimDate) : null;
    if (body.totalClaimAmount !== undefined) updateData.totalClaimAmount = body.totalClaimAmount;
    if (body.approvedAmount !== undefined) updateData.approvedAmount = body.approvedAmount;
    if (body.previousCertified !== undefined) updateData.previousCertified = body.previousCertified;

    // Auto-calculate netPayment when currentCertified or retentionAmount changes
    const currentCert = body.currentCertified !== undefined ? body.currentCertified : Number(existing.currentCertified);
    const retention = body.retentionAmount !== undefined ? body.retentionAmount : Number(existing.retentionAmount);

    if (body.currentCertified !== undefined) updateData.currentCertified = currentCert;
    if (body.retentionAmount !== undefined) updateData.retentionAmount = retention;

    // Always recalculate netPayment
    updateData.netPayment = currentCert - retention;

    if (body.status !== undefined) updateData.status = body.status;
    if (body.certifiedDate !== undefined) updateData.certifiedDate = body.certifiedDate ? new Date(body.certifiedDate) : null;
    if (body.certifiedById !== undefined) updateData.certifiedById = body.certifiedById || null;

    const progressClaim = await db.progressClaim.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(progressClaim);
  } catch (error) {
    log.error("Error updating progress claim:", error);
    return NextResponse.json({ error: "Failed to update progress claim" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    const existing = await db.progressClaim.findFirst({
      where: { id, ...orgFilter(ctx) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Progress claim not found" }, { status: 404 });
    }

    await db.progressClaim.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting progress claim:", error);
    return NextResponse.json({ error: "Failed to delete progress claim" }, { status: 500 });
  }
}
