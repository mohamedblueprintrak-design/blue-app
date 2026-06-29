import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedPermission } from "../../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse } from "../../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";
import { sanitizeObject } from "@/lib/security/sanitize";

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PUT /api/crm/leads/[id]
 * Update a lead
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { allowed: _allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const leadId = params.id;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_UPDATE);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    const existingLead = await db.lead.findFirst({
      where: {
        id: leadId,
        organizationId: user.organizationId || "default",
        deletedAt: null,
      },
    });

    if (!existingLead) {
      return errorResponse("العميل المحتمل غير موجود", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const sanitized = sanitizeObject(body);

    const { name, company, email, phone, status, estimatedValue, notes } = sanitized;

    const updateData: unknown = {};
    if (name !== undefined) updateData.name = name;
    if (company !== undefined) updateData.company = company;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    if (estimatedValue !== undefined) updateData.estimatedValue = Number(estimatedValue);
    if (notes !== undefined) updateData.notes = notes;

    const updatedLead = await db.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    return successResponse(updatedLead);
  } catch (error: unknown) {
    return errorResponse(error.message || "Internal Server Error", "INTERNAL_ERROR", 500);
  }
}

/**
 * DELETE /api/crm/leads/[id]
 * Soft delete a lead
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { allowed: _allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const leadId = params.id;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_UPDATE); // CLIENT_DELETE equivalent
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    const existingLead = await db.lead.findFirst({
      where: {
        id: leadId,
        organizationId: user.organizationId || "default",
        deletedAt: null,
      },
    });

    if (!existingLead) {
      return errorResponse("العميل المحتمل غير موجود", "NOT_FOUND", 404);
    }

    await db.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date() },
    });

    return successResponse({ success: true });
  } catch (error: unknown) {
    return errorResponse(error.message || "Internal Server Error", "INTERNAL_ERROR", 500);
  }
}
