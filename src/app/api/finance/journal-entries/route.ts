import { NextRequest } from "next/server";
import { errorResponse, successResponse, createdResponse } from "../../utils/response";
import { AccountingService } from "@/lib/services/accounting.service";
import { requireVerifiedPermission } from "../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { sanitizeObject } from "@/lib/security/sanitize";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";
import { z } from "zod";

const journalLineSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  debit: z.number().nonnegative("Debit must be non-negative"),
  credit: z.number().nonnegative("Credit must be non-negative"),
}).refine(
  (line) => (line.debit > 0 && line.credit === 0) || (line.credit > 0 && line.debit === 0),
  { message: "A journal line must specify either a debit or credit amount, but not both" }
);

const createJournalEntrySchema = z.object({
  date: z.string().optional(),
  reference: z.string().max(100).optional(),
  description: z.string().min(1, "Description is required").max(500),
  lines: z.array(journalLineSchema).min(2, "A journal entry must contain at least 2 lines"),
});

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

    if (!user.organizationId) {
      return errorResponse("غير مصرح بالدخول - لم يتم تحديد المؤسسة", "FORBIDDEN", 403);
    }

    // Scoped restriction to financial writing roles
    if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "ACCOUNTANT") {
      return errorResponse("غير مصرح بالدخول", "FORBIDDEN", 403);
    }

    const body = await request.json();
    
    // Zod validation
    const validation = createJournalEntrySchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, "BAD_REQUEST", 400);
    }

    const validatedData = validation.data;
    const { date, reference, description, lines } = validatedData;

    // Sanitize parameters
    const journalLines = lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
    }));

    const entry = await AccountingService.createJournalEntry(
      user.organizationId,
      {
        date: date ? new Date(date) : undefined,
        reference: reference,
        description: description,
        lines: journalLines,
      },
      user.userId
    );

    return createdResponse(entry);
  } catch (error: any) {
    return errorResponse(error.message || "Internal Server Error", "INTERNAL_ERROR", 500);
  }
}
