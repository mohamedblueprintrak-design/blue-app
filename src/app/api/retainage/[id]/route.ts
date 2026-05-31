import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for retainage update (PUT)
const retainageUpdateSchema = z.object({
  projectId: z.string().max(100).optional(),
  invoiceId: z.string().max(100).optional(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  retainedAmount: z.coerce.number().min(0).max(999999999).optional(),
  releaseDate: z.string().optional(),
  status: z.enum(['HELD', 'PARTIALLY_RELEASED', 'RELEASED']).optional(),
  releasedAmount: z.coerce.number().min(0).max(999999999).optional(),
  releasedDate: z.string().optional(),
});

// Zod schema for retainage release (PATCH)
const retainageReleaseSchema = z.object({
  releasedAmount: z.coerce.number().min(0).max(999999999).optional().default(0),
  isFullRelease: z.boolean().optional().default(false),
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

    const retainage = await db.retainage.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    if (!retainage) {
      return NextResponse.json({ error: "Retainage not found" }, { status: 404 });
    }

    return NextResponse.json(retainage);
  } catch (error) {
    log.error("Error fetching retainage:", error);
    return NextResponse.json({ error: "Failed to fetch retainage" }, { status: 500 });
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

    // Zod validation for retainage update
    const validation = retainageUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const body = validation.data;

    const existing = await db.retainage.findFirst({
      where: { id, ...orgFilter(ctx) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Retainage not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.invoiceId !== undefined) updateData.invoiceId = body.invoiceId || null;
    if (body.percentage !== undefined) updateData.percentage = body.percentage;
    if (body.retainedAmount !== undefined) updateData.retainedAmount = body.retainedAmount;
    if (body.releaseDate !== undefined) updateData.releaseDate = body.releaseDate ? new Date(body.releaseDate) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.releasedAmount !== undefined) updateData.releasedAmount = body.releasedAmount;
    if (body.releasedDate !== undefined) updateData.releasedDate = body.releasedDate ? new Date(body.releasedDate) : null;

    const retainage = await db.retainage.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(retainage);
  } catch (error) {
    log.error("Error updating retainage:", error);
    return NextResponse.json({ error: "Failed to update retainage" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PATCH is used specifically for releasing retainage
  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;
    const rawBody = await request.json();

    // Zod validation for retainage release
    const validation = retainageReleaseSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { releasedAmount, isFullRelease } = validation.data;

    const existing = await db.retainage.findFirst({
      where: { id, ...orgFilter(ctx) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Retainage not found" }, { status: 404 });
    }

    const releaseAmount = isFullRelease
      ? Number(existing.retainedAmount) - Number(existing.releasedAmount)
      : releasedAmount || 0;

    const newReleasedAmount = Number(existing.releasedAmount) + releaseAmount;
    const newStatus = newReleasedAmount >= Number(existing.retainedAmount) ? "RELEASED" : "PARTIALLY_RELEASED";

    const retainage = await db.retainage.update({
      where: { id },
      data: {
        releasedAmount: newReleasedAmount,
        releasedDate: new Date(),
        status: newStatus,
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(retainage);
  } catch (error) {
    log.error("Error releasing retainage:", error);
    return NextResponse.json({ error: "Failed to release retainage" }, { status: 500 });
  }
}
