import { NextRequest } from "next/server";
import { AccountingService } from "@/lib/services/accounting.service";
import { requireVerifiedPermission } from "../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse } from "../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";

/**
 * GET /api/finance/trial-balance
 * Retrieve Trial Balance sheet
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

    // Scoped restriction to financial roles
    if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "ACCOUNTANT") {
      return errorResponse("غير مصرح بالدخول", "FORBIDDEN", 403);
    }

    const trialBalance = await AccountingService.getTrialBalance(user.organizationId);
    return successResponse(trialBalance);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
