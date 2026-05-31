import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, inventoryCreateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INVENTORY_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const lowStock = searchParams.get("lowStock");

    const where: Record<string, unknown> = { deletedAt: null };

    if (projectId) {
      where.projectId = projectId;
    }
    if (lowStock === "true") {
      // Items where quantity is at or below minimum level
      where.quantity = { lte: undefined };
    }

    // Fetch all items and filter low stock in-memory for SQLite compatibility
    const orgWhere = ctx.organizationId ? { deletedAt: null, project: { organizationId: ctx.organizationId } } : { deletedAt: null };
    const items = await db.inventoryItem.findMany({
      where: projectId ? { projectId, ...orgWhere } : orgWhere,
      include: {
        project: {
          select: { id: true, number: true, name: true, nameEn: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute total value for each item
    const itemsWithTotal = items.map((item) => ({
      ...item,
      totalValue: Number(item.quantity) * Number(item.price),
      isLowStock: item.minimumLevel > 0 && item.quantity <= item.minimumLevel,
    }));

    // Filter low stock if requested
    const filteredItems = lowStock === "true"
      ? itemsWithTotal.filter((i) => i.isLowStock)
      : itemsWithTotal;

    // Summary stats
    const totalItems = items.length;
    const lowStockCount = itemsWithTotal.filter((i) => i.isLowStock).length;
    const totalValue = itemsWithTotal.reduce((sum, i) => sum + i.totalValue, 0);

    return NextResponse.json({
      items: filteredItems,
      summary: { totalItems, lowStockCount, totalValue },
    });
  } catch (error) {
    log.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INVENTORY_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();

    // Zod validation for inventory create fields
    const validation = validateRequest(inventoryCreateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const validatedData = validation.data;
    const { name, projectId, quantity, unit, price, location, minimumLevel } = validatedData;

    const item = await db.inventoryItem.create({
      data: {
        ...orgCreate(ctx),
        name,
        projectId: projectId || null,
        quantity: quantity || 0,
        unit: unit || "",
        price: price || 0,
        location: location || "",
        minimumLevel: minimumLevel || 0,
      },
      include: {
        project: {
          select: { id: true, number: true, name: true, nameEn: true },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    log.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
