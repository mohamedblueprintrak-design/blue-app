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

  const orgId = auth.user.organizationId as string;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const supplierId = searchParams.get("supplierId");
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!clientId && !supplierId) {
    return errorResponse("يجب تحديد العميل أو المورد", "BAD_REQUEST", 400);
  }

  try {
    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;

    if (clientId) {
      // ===== CUSTOMER STATEMENT =====
      const invoices = await db.invoice.findMany({
        where: {
          organizationId: orgId,
          clientId,
          deletedAt: null,
          status: { not: "DRAFT" },
          ...(startDate || endDate ? {
            issueDate: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            }
          } : {})
        },
        select: {
          id: true,
          number: true,
          issueDate: true,
          total: true,
          status: true,
        }
      });

      // Find all payments for this client's invoices
      const invoiceIds = invoices.map(i => i.id);
      const payments = await db.payment.findMany({
        where: {
          organizationId: orgId,
          invoiceId: { in: invoiceIds },
          status: "APPROVED",
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          invoice: { select: { number: true } }
        }
      });

      const transactions: Array<{
        date: Date;
        reference: string;
        type: "INVOICE" | "PAYMENT";
        description: string;
        debit: number;
        credit: number;
      }> = [];

      // Add Invoices as Debits (Customer owes money)
      for (const inv of invoices) {
        transactions.push({
          date: new Date(inv.issueDate),
          reference: inv.number,
          type: "INVOICE",
          description: "فاتورة مبيعات",
          debit: new Prisma.Decimal(inv.total).toNumber(),
          credit: 0,
        });
      }

      // Add Payments as Credits (Customer paid money)
      for (const pay of payments) {
        transactions.push({
          date: new Date(pay.createdAt),
          reference: `PAY-${pay.id.substring(0, 8).toUpperCase()}`,
          type: "PAYMENT",
          description: `سداد الفاتورة ${pay.invoice?.number || ""}`,
          debit: 0,
          credit: new Prisma.Decimal(pay.amount).toNumber(),
        });
      }

      // Sort chronologically
      transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      let runningBalance = new Prisma.Decimal(0);
      const history = transactions.map(tx => {
        runningBalance = runningBalance.add(tx.debit).sub(tx.credit);
        return {
          ...tx,
          balance: runningBalance.toNumber(),
        };
      });

      return successResponse({
        type: "CUSTOMER",
        history,
        endingBalance: runningBalance.toNumber(),
      });

    } else {
      // ===== SUPPLIER STATEMENT =====
      const purchaseOrders = await db.purchaseOrder.findMany({
        where: {
          organizationId: orgId,
          supplierId: supplierId as string,
          deletedAt: null,
          status: { in: ["approved", "received"] },
          ...(startDate || endDate ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            }
          } : {})
        },
        select: {
          id: true,
          number: true,
          amount: true,
          createdAt: true,
          status: true,
        }
      });

      const transactions: Array<{
        date: Date;
        reference: string;
        type: "PURCHASE" | "PAYMENT";
        description: string;
        debit: number;
        credit: number;
      }> = [];

      // Add POs as Credits (We owe supplier money)
      for (const po of purchaseOrders) {
        transactions.push({
          date: new Date(po.createdAt),
          reference: po.number || `PO-${po.id.substring(0, 8).toUpperCase()}`,
          type: "PURCHASE",
          description: `أمر شراء - حالة: ${po.status}`,
          debit: 0,
          credit: new Prisma.Decimal(po.amount).toNumber(),
        });
      }

      // Sort chronologically
      transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      let runningBalance = new Prisma.Decimal(0);
      const history = transactions.map(tx => {
        // For suppliers, credit increases what we owe (AP), debit decreases it.
        runningBalance = runningBalance.add(tx.credit).sub(tx.debit);
        return {
          ...tx,
          balance: runningBalance.toNumber(),
        };
      });

      return successResponse({
        type: "SUPPLIER",
        history,
        endingBalance: runningBalance.toNumber(),
      });
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
