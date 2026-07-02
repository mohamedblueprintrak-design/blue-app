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
    // Fetch all unpaid non-draft invoices
    const invoices = await db.invoice.findMany({
      where: {
        organizationId: organizationId as string,
        deletedAt: null,
        status: { not: "DRAFT" },
        remaining: { gt: 0 },
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    const clientAgingMap = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        phone: string;
        current: Prisma.Decimal;
        days30: Prisma.Decimal;
        days60: Prisma.Decimal;
        days90: Prisma.Decimal;
        total: Prisma.Decimal;
      }
    >();

    const today = new Date();

    for (const inv of invoices) {
      const clientId = inv.clientId || "unknown";
      const clientName = inv.client?.name || "عميل غير معروف";
      const phone = inv.client?.phone || "";
      const remaining = new Prisma.Decimal(inv.remaining);

      const existing = clientAgingMap.get(clientId) || {
        clientId,
        clientName,
        phone,
        current: new Prisma.Decimal(0),
        days30: new Prisma.Decimal(0),
        days60: new Prisma.Decimal(0),
        days90: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
      };

      const ageInDays = Math.floor(
        (today.getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24)
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
      clientAgingMap.set(clientId, existing);
    }

    const agingRows = Array.from(clientAgingMap.values()).map((row) => ({
      clientId: row.clientId,
      clientName: row.clientName,
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
