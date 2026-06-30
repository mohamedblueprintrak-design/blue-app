import { NextRequest } from "next/server";
import { AccountingService } from "@/lib/services/accounting.service";
import { requireVerifiedPermission } from "../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse, createdResponse } from "../../utils/response";
import { sanitizeObject } from "@/lib/security/sanitize";
import { AccountType } from "@prisma/client";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";

/**
 * GET /api/finance/accounts
 * Retrieve Chart of Accounts
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

    const { searchParams } = new URL(request.url);
    const typeStr = searchParams.get("type");
    const parentAccountId = searchParams.get("parentAccountId");

    const filter: { type?: AccountType; parentAccountId?: string | null } = {};
    if (typeStr && Object.values(AccountType).includes(typeStr as AccountType)) {
      filter.type = typeStr as AccountType;
    }
    if (parentAccountId !== null) {
      filter.parentAccountId = parentAccountId === "null" ? null : parentAccountId;
    }

    const accounts = await AccountingService.getAccounts(user.organizationId, filter);
    return successResponse(accounts);
  } catch (error: any) {
    return errorResponse(error.message || "Internal Server Error", "INTERNAL_ERROR", 500);
  }
}

/**
 * POST /api/finance/accounts
 * Create a new account
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
    const sanitized = sanitizeObject(body);

    const { code, nameAr, nameEn, type, description, parentAccountId } = sanitized;

    if (!code || !nameAr || !nameEn || !type) {
      return errorResponse("الحقول الأساسية مطلوبة (الكود، الاسم باللغة العربية، الاسم بالإنجليزية، النوع)", "BAD_REQUEST", 400);
    }

    if (!Object.values(AccountType).includes(type as AccountType)) {
      return errorResponse("نوع الحساب غير صالح", "BAD_REQUEST", 400);
    }

    const account = await AccountingService.createAccount(
      user.organizationId,
      {
        code: String(code),
        nameAr: String(nameAr),
        nameEn: String(nameEn),
        type: type as AccountType,
        description: description ? String(description) : undefined,
        parentAccountId: parentAccountId ? String(parentAccountId) : undefined,
      },
      user.userId
    );

    return createdResponse(account);
  } catch (error: any) {
    return errorResponse(error.message || "Internal Server Error", "INTERNAL_ERROR", 500);
  }
}
