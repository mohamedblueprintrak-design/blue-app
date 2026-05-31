import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, purchaseOrderUpdateSchema } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PURCHASE_ORDER_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = { ...orgFilterNested(ctx, 'project'), deletedAt: null };
    const order = await db.purchaseOrder.findFirst({
      where: { id, ...orgWhere },
      include: {
        supplier: true,
        project: {
          select: { id: true, number: true, name: true, nameEn: true },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    log.error("Error fetching purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.PURCHASE_ORDER_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(purchaseOrderUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { number, supplierId, projectId, amount, status, items } = body;

    // Verify org access
    const orgWhere = { ...orgFilterNested(ctx, 'project'), deletedAt: null };
    const existing = await db.purchaseOrder.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    // If items are provided, delete old ones and create new
    if (items !== undefined) {
      await db.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
    }

    const order = await db.purchaseOrder.update({
      where: { id },
      data: {
        number: number !== undefined ? number : undefined,
        supplierId: supplierId !== undefined ? supplierId : undefined,
        projectId: projectId !== undefined ? (projectId || null) : undefined,
        amount: amount !== undefined ? parseFloat(String(amount)) : undefined,
        status: status !== undefined ? status : undefined,
        items: items !== undefined && items.length > 0
          ? {
              create: items.map((item: { itemName: string; quantity: number; unitPrice: number; total: number }) => ({
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

    return NextResponse.json(order);
  } catch (error) {
    log.error("Error updating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.PURCHASE_ORDER_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = { ...orgFilterNested(ctx, 'project'), deletedAt: null };
    const existing = await db.purchaseOrder.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    await db.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting purchase order:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}
