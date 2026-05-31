import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateBody, supplierCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUPPLIER_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (category && category !== "all") {
      where.category = category;
    }

    const suppliers = await db.supplier.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    log.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUPPLIER_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await validateBody(request, supplierCreateSchema);
    if (body instanceof NextResponse) return body;
    const { name, category, email, phone, address, rating, creditLimit } = body;

    const supplier = await db.supplier.create({
      data: {
        name,
        category: (category || "MATERIALS") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        email: email || "",
        phone: phone || "",
        address: address || "",
        rating: rating || 0,
        creditLimit: creditLimit || 0,
        ...orgCreate(ctx),
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    log.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
