import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedPermission } from "../../../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse } from "../../../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";
import { cacheDeletePattern } from "@/lib/cache/redis";

/**
 * POST /api/crm/leads/[id]/convert
 * Convert a Won lead to a Client
 */
export async function POST(
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

    // Find the lead
    const lead = await db.lead.findFirst({
      where: {
        id: leadId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!lead) {
      return errorResponse("العميل المحتمل غير موجود", "NOT_FOUND", 404);
    }

    // Create the client
    const client = await db.client.create({
      data: {
        name: lead.name,
        company: lead.company || "",
        email: lead.email || "",
        phone: lead.phone || "",
        address: "",
        taxNumber: "",
        creditLimit: 0,
        paymentTerms: "",
        organizationId: user.organizationId,
        createdById: user.userId,
      },
    });

    // Update lead status to WON
    await db.lead.update({
      where: { id: leadId },
      data: { status: "WON" },
    });

    // Invalidate client & dashboard caches
    await cacheDeletePattern(`clients:${user.organizationId || 'global'}:*`);
    await cacheDeletePattern(`dashboard:${user.organizationId || 'global'}:*`);

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(msg, "INTERNAL_ERROR", 500);
  }
}
