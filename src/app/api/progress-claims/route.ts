import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// Zod schema for progress claim creation
const progressClaimCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  claimNumber: z.string().max(50).optional().default(''),
  period: z.string().max(100).optional().default(''),
  claimDate: z.string().optional().default(''),
  totalClaimAmount: z.coerce.number().min(0).max(999999999).optional().default(0),
  cumulativeWork: z.coerce.number().min(0).max(999999999).optional().default(0),
  currentClaim: z.coerce.number().min(0).max(999999999).optional().default(0),
  approvedAmount: z.coerce.number().min(0).max(999999999).optional().default(0),
  previousCertified: z.coerce.number().min(0).max(999999999).optional().default(0),
  currentCertified: z.coerce.number().min(0).max(999999999).optional().default(0),
  retentionAmount: z.coerce.number().min(0).max(999999999).optional().default(0),
  retention: z.coerce.number().min(0).max(999999999).optional().default(0),
  status: z.enum(['DRAFT', 'SUBMITTED', 'CERTIFIED', 'APPROVED', 'REJECTED', 'PAID']).default('DRAFT'),
  certifiedDate: z.string().optional().default(''),
  certifiedById: z.string().max(100).optional().default(''),
  remarks: z.string().max(5000).optional().default(''),
});

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const progressClaims = await db.progressClaim.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(progressClaims);
  } catch (error) {
    log.error("Error fetching progress claims:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress claims" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const rawBody = await request.json();

    // Zod validation for progress claim fields
    const validation = progressClaimCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const {
      projectId, claimNumber, period, claimDate,
      totalClaimAmount, approvedAmount, previousCertified,
      currentCertified, retentionAmount, status, certifiedDate, certifiedById,
    } = validation.data;

    const currentCert = currentCertified || 0;
    const retention = retentionAmount || 0;
    const netPayment = currentCert - retention;

    const progressClaim = await db.progressClaim.create({
      data: {
        projectId,
        claimNumber: claimNumber || "",
        period: period || "",
        claimDate: claimDate ? new Date(claimDate) : null,
        totalClaimAmount: totalClaimAmount || 0,
        approvedAmount: approvedAmount || 0,
        previousCertified: previousCertified || 0,
        currentCertified: currentCert,
        retentionAmount: retention,
        netPayment,
        status: (status || "DRAFT"),
        certifiedDate: certifiedDate ? new Date(certifiedDate) : null,
        certifiedById: certifiedById || null,
        ...orgCreate(ctx),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(progressClaim, { status: 201 });
  } catch (error) {
    log.error("Error creating progress claim:", error);
    return NextResponse.json(
      { error: "Failed to create progress claim" },
      { status: 500 }
    );
  }
}
