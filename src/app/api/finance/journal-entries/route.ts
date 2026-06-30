import { NextRequest } from "next/server";
import { errorResponse, successResponse, createdResponse } from "../../utils/response";
import { AccountingService } from "@/lib/services/accounting.service";
import { requireVerifiedPermission } from "../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { sanitizeObject } from "@/lib/security/sanitize";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";

/**
 * POST /api/finance/journal-entries
 * Create a new double-entry journal entry
 */
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    // Scoped restriction to financial writing roles
    if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "ACCOUNTANT") {
      return errorResponse("غير مصرح بالدخول", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const sanitized = sanitizeObject(body);

    const { date, reference, description, lines } = sanitized;

    if (!description || !lines || !Array.isArray(lines) || lines.length < 2) {
      return errorResponse("الوصف وتفاصيل القيود (سطرين على الأقل) مطلوبة", "BAD_REQUEST", 400);
    }

    // Map lines and parse amounts securely
    const journalLines = lines.map((line: any) => ({
      accountId: String(line.accountId),
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
    }));

    const entry = await AccountingService.createJournalEntry(
      user.organizationId || "default",
      {
        date: date ? new Date(date) : undefined,
        reference: reference ? String(reference) : undefined,
        description: String(description),
        lines: journalLines,
      },
      user.userId
    );

    return createdResponse(entry);
  } catch (error: any) {
    return errorResponse(error.message || "Internal Server Error", "INTERNAL_ERROR", 500);
  }
}
