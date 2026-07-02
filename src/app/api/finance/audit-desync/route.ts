import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedPermission } from "../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse } from "../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";
import { log } from "@/lib/logger";
import { createInvoiceJournalEntry, createPaymentJournalEntry } from "@/lib/services/accounting.service";

/**
 * GET /api/finance/audit-desync
 * Detect and optionally heal General Ledger desynchronizations
 */
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    if (!user.organizationId) {
      return errorResponse("غير مصرح بالدخول - لم يتم تحديد المؤسسة", "FORBIDDEN", 403);
    }

    if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "ACCOUNTANT") {
      return errorResponse("غير مصرح بالدخول - يتطلب صلاحيات مالية", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const fixRequested = searchParams.get("fix") === "true";

    // 1. Fetch active, posted invoices
    const invoices = await db.invoice.findMany({
      where: {
        organizationId: user.organizationId,
        status: { notIn: ["DRAFT", "CANCELLED"] },
        deletedAt: null,
      },
      select: {
        id: true,
        number: true,
        status: true,
        subtotal: true,
        tax: true,
        total: true,
        paidAmount: true,
      },
    });

    // 2. Fetch all journal entries for reference comparison
    const journalEntries = await db.journalEntry.findMany({
      where: { organizationId: user.organizationId },
      select: { reference: true },
    });

    const jeReferences = new Set(
      journalEntries.map((je) => je.reference).filter((ref): ref is string => Boolean(ref))
    );

    // 3. Scan for desyncs
    interface DesyncedInvoice {
      id: string;
      number: string;
      status: string;
      subtotal: number;
      tax: number;
      total: number;
    }

    interface DesyncedPayment {
      id: string;
      number: string;
      status: string;
      paidAmount: number;
    }

    const desyncedInvoices: DesyncedInvoice[] = [];
    const desyncedPayments: DesyncedPayment[] = [];

    for (const inv of invoices) {
      // Check if invoice journal entry is missing
      if (!jeReferences.has(inv.number)) {
        desyncedInvoices.push({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          subtotal: Number(inv.subtotal),
          tax: Number(inv.tax),
          total: Number(inv.total),
        });
      }

      // Check if payment journal entry is missing (if paidAmount > 0)
      if (Number(inv.paidAmount) > 0 && !jeReferences.has(`PAYMENT-${inv.number}`)) {
        desyncedPayments.push({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          paidAmount: Number(inv.paidAmount),
        });
      }
    }

    const fixedInvoices: string[] = [];
    const fixedPayments: string[] = [];

    // 4. Auto-healing if requested
    if (fixRequested) {
      // Require create/update rights for healing write operations
      const writeCheck = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
      if ("error" in writeCheck) {
        return errorResponse("غير مصرح بإصلاح الأخطاء المزامنة - يتطلب صلاحيات كتابة مالية", "FORBIDDEN", 403);
      }

      // Fix Invoices
      for (const inv of desyncedInvoices) {
        try {
          await db.$transaction(async (tx) => {
            await createInvoiceJournalEntry(tx, user.organizationId!, inv.number, inv.subtotal, inv.tax, user.userId);
          });
          fixedInvoices.push(inv.number);
        } catch (err) {
          log.error(`AuditDesync: Failed to auto-heal invoice entry for ${inv.number}`, err);
        }
      }

      // Fix Payments
      for (const pm of desyncedPayments) {
        try {
          await db.$transaction(async (tx) => {
            await createPaymentJournalEntry(tx, user.organizationId!, pm.number, pm.paidAmount, "bank", user.userId);
          });
          fixedPayments.push(pm.number);
        } catch (err) {
          log.error(`AuditDesync: Failed to auto-heal payment entry for ${pm.number}`, err);
        }
      }
    }

    return successResponse({
      desyncedInvoices,
      desyncedPayments,
      fixedInvoices,
      fixedPayments,
      summary: {
        desyncedInvoicesCount: desyncedInvoices.length,
        desyncedPaymentsCount: desyncedPayments.length,
        fixedInvoicesCount: fixedInvoices.length,
        fixedPaymentsCount: fixedPayments.length,
      },
    });
  } catch (error) {
    log.error("Error in GL Desync Audit endpoint:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
