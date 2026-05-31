import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, paymentUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PAYMENT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilter(ctx);
    const payment = await db.payment.findFirst({
      where: { id, ...orgWhere },
      include: {
        approver: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    log.error("Error fetching payment:", error);
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PAYMENT_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);

    // Zod validation for payment update fields
    const validation = validateRequest(paymentUpdateSchema, sanitizedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const { status, amount, payMethod, beneficiary, referenceNumber, description } = validation.data;

    const orgWhere = orgFilter(ctx);
    const existing = await db.payment.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Auto-set approvedById when status transitions to APPROVED
    const isApproving = status === 'APPROVED' && existing.status !== 'APPROVED';

    const payment = await db.payment.update({
      where: { id },
      data: {
        ...(status !== undefined && { status: status as any }),
        ...(isApproving && { approvedById: ctx.userId }),
        ...(amount !== undefined && { amount }),
        ...(payMethod !== undefined && { payMethod: payMethod as any }),
        ...(beneficiary !== undefined && { beneficiary }),
        ...(referenceNumber !== undefined && { referenceNumber }),
        ...(description !== undefined && { description }),
      },
      include: {
        approver: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    log.error("Error updating payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
