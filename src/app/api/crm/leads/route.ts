import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedPermission } from "../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse, createdResponse } from "../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";
import { sanitizeObject } from "@/lib/security/sanitize";

/**
 * GET /api/crm/leads
 * Fetch active leads for organization
 */
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_READ);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    if (!user.organizationId) {
      return errorResponse("غير مصرح بالدخول - لم يتم تحديد المؤسسة", "FORBIDDEN", 403);
    }

    const leads = await db.lead.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return successResponse(leads);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}

/**
 * POST /api/crm/leads
 * Create a new lead
 */
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_CREATE);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    if (!user.organizationId) {
      return errorResponse("غير مصرح بالدخول - لم يتم تحديد المؤسسة", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const sanitized = sanitizeObject(body);

    const { name, company, email, phone, status, estimatedValue, notes } = sanitized;

    if (!name || name.trim() === "") {
      return errorResponse("الاسم مطلوب", "VALIDATION_ERROR", 400);
    }

    const lead = await db.lead.create({
      data: {
        name,
        company: company || "",
        email: email || "",
        phone: phone || "",
        status: status || "NEW",
        estimatedValue: estimatedValue ? Number(estimatedValue) : 0,
        notes: notes || "",
        organizationId: user.organizationId,
      },
    });

    return createdResponse(lead);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
