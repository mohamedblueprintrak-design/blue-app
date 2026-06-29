import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../db";
import { requireVerifiedPermission } from "../../../../utils/auth";
import { Permission } from "@/lib/auth/types";
import { errorResponse, successResponse } from "../../../../utils/response";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";
import { cacheDeletePattern } from "@/lib/cache/redis";

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/crm/leads/[id]/convert
 * Convert a Won lead to a Client
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { allowed, result } = await withRateLimit(request, "api");
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const leadId = params.id;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_UPDATE);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    // Find the lead
    const lead = await db.lead.findFirst({
      where: {
        id: leadId,
        organizationId: user.organizationId || "default",
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
        organizationId: user.organizationId || "default",
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
  } catch (error: any) {
    return errorResponse(error.message || "Internal Server Error", "INTERNAL_ERROR", 500);
  }
}
