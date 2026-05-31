import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, inventoryUpdateSchema } from '@/lib/api-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INVENTORY_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};

    const item = await db.inventoryItem.findFirst({
      where: { id, ...orgWhere },
      include: {
        project: {
          select: { id: true, number: true, name: true, nameEn: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...item,
      totalValue: Number(item.quantity) * Number(item.price),
      isLowStock: item.minimumLevel > 0 && item.quantity <= item.minimumLevel,
    });
  } catch (error) {
    log.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INVENTORY_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(inventoryUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { name, projectId, quantity, unit, price, location, minimumLevel } = body;

    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const existing = await db.inventoryItem.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        projectId: projectId !== undefined ? (projectId || null) : undefined,
        quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
        unit: unit !== undefined ? unit : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        location: location !== undefined ? location : undefined,
        minimumLevel: minimumLevel !== undefined ? parseFloat(minimumLevel) : undefined,
      },
      include: {
        project: {
          select: { id: true, number: true, name: true, nameEn: true },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    log.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INVENTORY_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const existing = await db.inventoryItem.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    await db.inventoryItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
