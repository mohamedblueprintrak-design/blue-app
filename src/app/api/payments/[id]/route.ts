import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, paymentUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { requireStepUp2FA } from '@/lib/auth/step-up-2fa';

import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
    const blocked = rateLimitResponse(rlResult);
    if (blocked) return blocked;

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
    const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'strict');
    const blocked = rateLimitResponse(rlResult);
    if (blocked) return blocked;

    const result = await requireVerifiedPermission(request, Permission.PAYMENT_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    // ── Step-up 2FA: required for payment updates (sensitive financial operation) ──
    const stepUpResult = await requireStepUp2FA(request, ctx);
    if ('error' in stepUpResult) return stepUpResult.error;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    const validation = validateRequest(paymentUpdateSchema, body);

    // Zod validation for payment update fields
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const _sanitizedBody = sanitizeObject(validation.data);

    const { status, amount, payMethod, beneficiary, referenceNumber, description } = validation.data;

    const orgWhere = orgFilter(ctx);
    const existing = await db.payment.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Auto-set approvedById when status transitions to APPROVED
    const isApproving = status === 'APPROVED' && existing.status !== 'APPROVED';

    // Optimistic Concurrency Control (OCC): match on existing updatedAt to prevent race conditions
    const updateResult = await db.payment.updateMany({
      where: { id, ...orgWhere, updatedAt: existing.updatedAt },
      data: {
        ...(status !== undefined && { status: status }),
        ...(isApproving && { approvedById: ctx.userId }),
        ...(amount !== undefined && { amount }),
        ...(payMethod !== undefined && { payMethod: payMethod }),
        ...(beneficiary !== undefined && { beneficiary }),
        ...(referenceNumber !== undefined && { referenceNumber }),
        ...(description !== undefined && { description }),
        updatedById: ctx.userId,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: "تم تحديث الدفعة بواسطة مستخدم آخر، يرجى إعادة المحاولة" },
        { status: 409 }
      );
    }

    // Fetch the updated payment to return in the response
    const updatedPayment = await db.payment.findFirst({
      where: { id, ...orgWhere },
      include: {
        approver: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    // Create audit log entry in ActivityLog
    await db.activityLog.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.organizationId || '',
        action: "UPDATE",
        entityType: "payment",
        entityId: id,
        details: `Updated payment status to ${status || existing.status}, amount to ${amount || existing.amount}`,
        projectId: existing.projectId,
      }
    });

    return NextResponse.json(updatedPayment);
  } catch (error) {
    log.error("Error updating payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
