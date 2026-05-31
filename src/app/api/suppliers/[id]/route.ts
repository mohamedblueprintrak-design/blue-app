import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, supplierUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUPPLIER_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const supplier = await db.supplier.findFirst({
      where: { id, deletedAt: null, ...orgFilter(ctx) },
      include: {
        purchaseOrders: {
          include: {
            project: { select: { id: true, number: true, name: true, nameEn: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    log.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUPPLIER_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify supplier belongs to user's org
    const existingSupplier = await db.supplier.findFirst({
      where: { id, ...orgFilter(ctx) },
    });
    if (!existingSupplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);

    // Zod validation for supplier update fields
    const validation = validateRequest(supplierUpdateSchema, sanitizedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const validatedData = validation.data;

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.category !== undefined && { category: validatedData.category as any }),
        ...(validatedData.email !== undefined && { email: validatedData.email }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
        ...(validatedData.address !== undefined && { address: validatedData.address }),
        ...(validatedData.rating !== undefined && { rating: validatedData.rating }),
        ...(validatedData.creditLimit !== undefined && { creditLimit: validatedData.creditLimit }),
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    log.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUPPLIER_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Check if supplier has purchase orders and belongs to user's org
    const supplier = await db.supplier.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: { _count: { select: { purchaseOrders: true } } },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (supplier._count.purchaseOrders > 0) {
      return NextResponse.json(
        { error: "Cannot delete supplier with existing purchase orders" },
        { status: 400 }
      );
    }

    await db.supplier.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
