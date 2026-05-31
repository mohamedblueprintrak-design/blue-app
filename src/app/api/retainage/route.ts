import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// Zod schema for retainage creation
const retainageCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  invoiceId: z.string().max(100).optional().default(''),
  contractId: z.string().max(100).optional().default(''),
  percentage: z.coerce.number().min(0).max(100).optional().default(0),
  retainedAmount: z.coerce.number().min(0).max(999999999).optional().default(0),
  amount: z.coerce.number().min(0).max(999999999).optional().default(0),
  releaseDate: z.string().optional().default(''),
  status: z.enum(['HELD', 'PARTIALLY_RELEASED', 'RELEASED']).default('HELD'),
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

    const retainages = await db.retainage.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(retainages);
  } catch (error) {
    log.error("Error fetching retainages:", error);
    return NextResponse.json(
      { error: "Failed to fetch retainages" },
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

    // Zod validation for retainage fields
    const validation = retainageCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { projectId, invoiceId, percentage, retainedAmount, releaseDate, status } = validation.data;

    const retainage = await db.retainage.create({
      data: {
        projectId,
        invoiceId: invoiceId || null,
        percentage: percentage || 0,
        retainedAmount: retainedAmount || 0,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        status: status || "HELD",
        releasedAmount: 0,
        ...orgCreate(ctx),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(retainage, { status: 201 });
  } catch (error) {
    log.error("Error creating retainage:", error);
    return NextResponse.json(
      { error: "Failed to create retainage" },
      { status: 500 }
    );
  }
}
