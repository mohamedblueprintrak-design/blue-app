import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedPermission } from "../../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse } from "../../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";
import { sanitizeObject } from "@/lib/security/sanitize";



/**
 * PUT /api/crm/leads/[id]
 * Update a lead
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const { id: leadId } = await params;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_UPDATE);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    if (!user.organizationId) {
      return errorResponse("غير مصرح بالدخول - لم يتم تحديد المؤسسة", "FORBIDDEN", 403);
    }

    const existingLead = await db.lead.findFirst({
      where: {
        id: leadId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!existingLead) {
      return errorResponse("العميل المحتمل غير موجود", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const sanitized = sanitizeObject(body);

    const { name, company, email, phone, status, estimatedValue, notes } = sanitized;

    const updateData: Record<string, string | number | null | undefined> = {};
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}

/**
 * DELETE /api/crm/leads/[id]
 * Soft delete a lead
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const { id: leadId } = await params;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_UPDATE); // CLIENT_DELETE equivalent
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    if (!user.organizationId) {
      return errorResponse("غير مصرح بالدخول - لم يتم تحديد المؤسسة", "FORBIDDEN", 403);
    }

    const existingLead = await db.lead.findFirst({
      where: {
        id: leadId,
        organizationId: user.organizationId,
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
