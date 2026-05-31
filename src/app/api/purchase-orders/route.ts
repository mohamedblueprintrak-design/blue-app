import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, purchaseOrderCreateSchema } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PURCHASE_ORDER_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { ...orgFilter(ctx) };

    if (status && status !== "all") {
      where.status = status;
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const orders = await db.purchaseOrder.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        supplier: {
          select: { id: true, name: true, category: true },
        },
        project: {
          select: { id: true, number: true, name: true, nameEn: true },
        },
        items: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Summary stats
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.amount), 0);
    const pendingApproval = orders.filter((o) => o.status === "SUBMITTED").length;

    return NextResponse.json({
      orders,
      summary: { totalOrders, totalAmount, pendingApproval },
    });
  } catch (error) {
    log.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.PURCHASE_ORDER_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();

    // Zod validation for purchase order create fields
    const validation = validateRequest(purchaseOrderCreateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const validatedData = validation.data;
    // items is not part of the schema but may be passed for nested creation
    const items = (rawBody as Record<string, unknown>)?.items as Array<{ itemName: string; quantity: number; unitPrice: number; total: number }> | undefined;
    const { number, supplierId, projectId, amount, status } = validatedData;

    const order = await db.purchaseOrder.create({
      data: {
        number,
        supplierId,
        projectId: projectId || null,
        amount: amount || 0,
        status: (status || "DRAFT") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ...orgCreate(ctx),
        createdById: ctx.userId,
        items: items && items.length > 0
          ? {
              create: items.map((item) => ({
                itemName: item.itemName,
                quantity: parseFloat(String(item.quantity)) || 1,
                unitPrice: parseFloat(String(item.unitPrice)) || 0,
                total: parseFloat(String(item.total)) || 0,
              })),
            }
          : undefined,
      },
      include: {
        supplier: true,
        project: {
          select: { id: true, number: true, name: true, nameEn: true },
        },
        items: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    log.error("Error creating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
