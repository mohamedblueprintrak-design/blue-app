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
    const projects = await db.project.findMany({
      where: {
        organizationId: organizationId as string,
        deletedAt: null,
      },
      include: {
        invoices: {
          where: { deletedAt: null, status: { not: "DRAFT" } },
          select: { total: true },
        },
        purchaseOrders: {
          where: { deletedAt: null, status: { in: ["approved", "received"] } },
          select: { amount: true },
        },
      },
    });

    const report = [];

    for (const proj of projects) {
      const budget = new Prisma.Decimal(proj.budget || 0);

      // Actual revenue invoiced
      let invoiced = new Prisma.Decimal(0);
      for (const inv of proj.invoices) {
        invoiced = invoiced.add(inv.total);
      }

      // Actual cost spent (based on purchase orders and direct subcontractor/material costs)
      let spent = new Prisma.Decimal(0);
      for (const po of proj.purchaseOrders) {
        spent = spent.add(po.amount);
      }

      const variance = budget.sub(spent);
      const utilization = budget.gt(0) ? spent.div(budget).mul(100).toNumber() : 0;

      report.push({
        projectId: proj.id,
        projectName: proj.name,
        projectNameEn: proj.nameEn || proj.name,
        budget: budget.toNumber(),
        invoiced: invoiced.toNumber(),
        actualCost: spent.toNumber(),
        variance: variance.toNumber(),
        utilization,
        status: proj.status,
      });
    }

    return successResponse(report);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
