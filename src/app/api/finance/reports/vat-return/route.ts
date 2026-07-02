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
  const orgId = organizationId as string;
  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  try {
    const whereClause: Prisma.JournalEntryWhereInput = {
      organizationId: orgId,
    };

    if (startDateStr || endDateStr) {
      whereClause.date = {};
      if (startDateStr) whereClause.date.gte = new Date(startDateStr);
      if (endDateStr) whereClause.date.lte = new Date(endDateStr);
    }

    const vatAccount = await db.account.findFirst({
      where: { organizationId: orgId, code: "2200" },
    });

    let outputVat = new Prisma.Decimal(0);
    let inputVat = new Prisma.Decimal(0);
    let hasLedgerEntries = false;

    if (vatAccount) {
      const vatLines = await db.journalLine.findMany({
        where: {
          accountId: vatAccount.id,
          journalEntry: whereClause,
        },
      });

      if (vatLines.length > 0) {
        hasLedgerEntries = true;
        for (const line of vatLines) {
          outputVat = outputVat.add(line.credit); // Sales Output VAT
          inputVat = inputVat.add(line.debit);   // Expense Input VAT
        }
      }
    }

    // 2. Fallback to direct Invoice & PurchaseOrder calculation if no ledger entries exist
    let taxableSales = new Prisma.Decimal(0);
    let taxableExpenses = new Prisma.Decimal(0);

    if (!hasLedgerEntries) {
      const invoiceWhere: Prisma.InvoiceWhereInput = {
        organizationId: orgId,
        deletedAt: null,
        status: { not: "DRAFT" },
      };
      if (startDateStr || endDateStr) {
        invoiceWhere.issueDate = {};
        if (startDateStr) invoiceWhere.issueDate.gte = new Date(startDateStr);
        if (endDateStr) invoiceWhere.issueDate.lte = new Date(endDateStr);
      }

      const invoices = await db.invoice.findMany({
        where: invoiceWhere,
        select: { subtotal: true, tax: true },
      });

      for (const inv of invoices) {
        taxableSales = taxableSales.add(inv.subtotal);
        outputVat = outputVat.add(inv.tax);
      }

      // Query purchase orders as fallback for standard rated expenses
      const poWhere: Prisma.PurchaseOrderWhereInput = {
        organizationId: orgId,
        deletedAt: null,
        status: { in: ["approved", "received"] },
      };
      if (startDateStr || endDateStr) {
        poWhere.createdAt = {};
        if (startDateStr) poWhere.createdAt.gte = new Date(startDateStr);
        if (endDateStr) poWhere.createdAt.lte = new Date(endDateStr);
      }

      const purchaseOrders = await db.purchaseOrder.findMany({
        where: poWhere,
        select: { amount: true },
      });

      for (const po of purchaseOrders) {
        // Assume 5% VAT rate on approved purchases/expenses
        const poAmount = new Prisma.Decimal(po.amount);
        const poSubtotal = poAmount.div(1.05);
        const poVat = poAmount.sub(poSubtotal);
        taxableExpenses = taxableExpenses.add(poSubtotal);
        inputVat = inputVat.add(poVat);
      }
    } else {
      // If we had ledger entries, estimate taxable amounts (VAT is 5% in UAE)
      taxableSales = outputVat.mul(20);
      taxableExpenses = inputVat.mul(20);
    }

    const netVat = outputVat.sub(inputVat);

    return successResponse({
      taxableSales: taxableSales.toNumber(),
      outputVat: outputVat.toNumber(),
      taxableExpenses: taxableExpenses.toNumber(),
      inputVat: inputVat.toNumber(),
      netVat: netVat.toNumber(),
      isPayable: netVat.gte(0),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
