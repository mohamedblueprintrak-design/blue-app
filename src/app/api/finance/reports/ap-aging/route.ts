import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedPermission } from "../../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse } from "../../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const auth = await requireVerifiedPermission(request, Permission.REPORTS_READ);
  if ("error" in auth) {
    return auth.error;
  }

  const { organizationId } = auth.user;

  try {
    // Fetch all approved/received purchase orders representing payables
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: {
        organizationId: organizationId as string,
        deletedAt: null,
        status: { in: ["approved", "received"] },
      },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    const supplierAgingMap = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        phone: string;
        current: Prisma.Decimal;
        days30: Prisma.Decimal;
        days60: Prisma.Decimal;
        days90: Prisma.Decimal;
        total: Prisma.Decimal;
      }
    >();

    const today = new Date();

    for (const po of purchaseOrders) {
      const supplierId = po.supplierId;
      const supplierName = po.supplier?.name || "مورد غير معروف";
      const phone = po.supplier?.phone || "";
      const remaining = new Prisma.Decimal(po.amount); // Assume PO amount is outstanding for AP aging until fully paid

      const existing = supplierAgingMap.get(supplierId) || {
        supplierId,
        supplierName,
        phone,
        current: new Prisma.Decimal(0),
        days30: new Prisma.Decimal(0),
        days60: new Prisma.Decimal(0),
        days90: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
      };

      const ageInDays = Math.floor(
        (today.getTime() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (ageInDays <= 30) {
        existing.current = existing.current.add(remaining);
      } else if (ageInDays <= 60) {
        existing.days30 = existing.days30.add(remaining);
      } else if (ageInDays <= 90) {
        existing.days60 = existing.days60.add(remaining);
      } else {
        existing.days90 = existing.days90.add(remaining);
      }

      existing.total = existing.total.add(remaining);
      supplierAgingMap.set(supplierId, existing);
    }

    const agingRows = Array.from(supplierAgingMap.values()).map((row) => ({
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      phone: row.phone,
      current: row.current.toNumber(),
      days30: row.days30.toNumber(),
      days60: row.days60.toNumber(),
      days90: row.days90.toNumber(),
      total: row.total.toNumber(),
    }));

    return successResponse(agingRows);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
