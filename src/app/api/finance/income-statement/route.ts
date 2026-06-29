import { NextRequest } from "next/server";
import { AccountingService } from "@/lib/services/accounting.service";
import { requireVerifiedPermission } from "../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse } from "../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";

/**
 * GET /api/finance/income-statement
 * Retrieve Profit & Loss Statement (Income Statement)
 */
export async function GET(request: NextRequest) {
  const { allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    // Scoped restriction to financial roles
    if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "ACCOUNTANT") {
      return errorResponse("غير مصرح بالدخول", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const statement = await AccountingService.getIncomeStatement(
      user.organizationId || "default",
      startDate,
      endDate
    );
    return successResponse(statement);
  } catch (error: any) {
    return errorResponse(error.message || "Internal Server Error", "INTERNAL_ERROR", 500);
  }
}
