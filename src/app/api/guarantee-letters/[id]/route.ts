import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for guarantee letter update
const guaranteeLetterUpdateSchema = z.object({
  projectId: z.string().max(100).optional(),
  type: z.enum(['PERFORMANCE', 'ADVANCE_PAYMENT', 'RETENTION', 'BID_BOND', 'CUSTOMS']).optional(),
  guaranteeNumber: z.string().max(100).optional(),
  bankName: z.string().max(200).optional(),
  amount: z.coerce.number().min(0).max(999999999).optional(),
  currency: z.string().max(10).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'RELEASED', 'CANCELLED', 'CALLED']).optional(),
  beneficiaryName: z.string().max(200).optional(),
  documentUrl: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
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

    const guaranteeLetter = await db.guaranteeLetter.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    if (!guaranteeLetter) {
      return NextResponse.json({ error: "Guarantee letter not found" }, { status: 404 });
    }

    return NextResponse.json(guaranteeLetter);
  } catch (error) {
    log.error("Error fetching guarantee letter:", error);
    return NextResponse.json({ error: "Failed to fetch guarantee letter" }, { status: 500 });
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

    // Zod validation for guarantee letter update
    const validation = guaranteeLetterUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const body = validation.data;

    const existing = await db.guaranteeLetter.findFirst({
      where: { id, ...orgFilter(ctx) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Guarantee letter not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.guaranteeNumber !== undefined) updateData.guaranteeNumber = body.guaranteeNumber;
    if (body.bankName !== undefined) updateData.bankName = body.bankName;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.issueDate !== undefined) updateData.issueDate = body.issueDate ? new Date(body.issueDate) : null;
    if (body.expiryDate !== undefined) updateData.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.beneficiaryName !== undefined) updateData.beneficiaryName = body.beneficiaryName;
    if (body.documentUrl !== undefined) updateData.documentUrl = body.documentUrl;

    const guaranteeLetter = await db.guaranteeLetter.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(guaranteeLetter);
  } catch (error) {
    log.error("Error updating guarantee letter:", error);
    return NextResponse.json({ error: "Failed to update guarantee letter" }, { status: 500 });
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

    const existing = await db.guaranteeLetter.findFirst({
      where: { id, ...orgFilter(ctx) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Guarantee letter not found" }, { status: 404 });
    }

    await db.guaranteeLetter.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting guarantee letter:", error);
    return NextResponse.json({ error: "Failed to delete guarantee letter" }, { status: 500 });
  }
}
