import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, paymentCreateSchema } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK (JWT-verified for payments)
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const { page, limit } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          approver: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, nameEn: true, number: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: calculateSkip(page, limit),
        take: limit,
      }),
      db.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error) {
    log.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // RBAC CHECK (JWT-verified for payments)
    const rbac = await requireVerifiedPermission(request, Permission.PAYMENT_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);

    // Zod validation for payment fields
    const validation = validateRequest(paymentCreateSchema, sanitizedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const { voucherNumber, projectId, amount, payMethod, beneficiary, referenceNumber, description } = validation.data;

    // Idempotency / Double-charge prevention
    const idempotencyKey = request.headers.get('idempotency-key');
    
    // Check for exact duplicate payment within the last 2 minutes (prevents double-clicks)
    const recentDuplicate = await db.payment.findFirst({
      where: {
        createdById: ctx.userId,
        amount,
        projectId: projectId || null,
        beneficiary: beneficiary || "",
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      }
    });

    if (recentDuplicate) {
      log.warn("Prevented double-charge (idempotency)", { userId: ctx.userId, amount, projectId });
      return NextResponse.json(recentDuplicate, { status: 200 });
    }

    const payment = await db.payment.create({
      data: {
        voucherNumber: voucherNumber || "",
        projectId: projectId || null,
        amount,
        payMethod: payMethod as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        beneficiary: beneficiary || "",
        referenceNumber: referenceNumber || "",
        description: description || "",
        ...orgCreate(ctx),
        createdById: ctx.userId,
      },
      include: {
        approver: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    log.error("Error creating payment:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
