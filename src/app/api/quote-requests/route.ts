import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, quoteRequestSchema } from "@/lib/api-validation";
import { sanitizeString, validateXSS, validateSQLInjection } from "@/lib/security/sanitize";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter } from '../utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function POST(request: Request) {
  // Rate limiting for public form submissions (10 requests per minute per IP)
  const { result: rateLimitResult } = await withRateLimit(request as NextRequest, 'publicForm');
  const rlBlocked = rateLimitResponse(rateLimitResult);
  if (rlBlocked) return rlBlocked;

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateRequest(quoteRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name, phone, email, serviceType, buildingType, area, floors, location, message } = validation.data;

    // Security: Check for XSS and SQL injection in string fields
    const stringFields = [name, phone, email || "", serviceType || "", buildingType || "", area || "", location || "", message || ""];
    for (const field of stringFields) {
      if (validateXSS(field)) {
        return NextResponse.json(
          { error: "تم رفض الإدخال لأسباب أمنية" },
          { status: 400 }
        );
      }
      if (validateSQLInjection(field)) {
        return NextResponse.json(
          { error: "تم رفض الإدخال لأسباب أمنية" },
          { status: 400 }
        );
      }
    }

    // SECURITY: In multi-tenant mode, require orgId from the request to prevent
    // data being assigned to the wrong organization. In single-tenant mode,
    // default to the first (only) organization.
    const isMultiTenant = process.env.MULTI_TENANT === 'true';
    const requestOrgId = body.orgId as string | undefined;
    let orgId: string;

    if (requestOrgId) {
      // Validate the orgId exists
      const requestedOrg = await db.organization.findUnique({ where: { id: requestOrgId }, select: { id: true } });
      if (!requestedOrg) {
        return NextResponse.json({ error: "المؤسسة غير موجودة" }, { status: 400 });
      }
      orgId = requestedOrg.id;
    } else if (isMultiTenant) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    } else {
      // Single-tenant: use the first (only) organization
      const org = await db.organization.findFirst();
      if (!org) {
        return NextResponse.json({ error: "لا يوجد مؤسسة" }, { status: 500 });
      }
      orgId = org.id;
    }

    // Sanitize string fields before storing
    const quoteRequest = await db.quoteRequest.create({
      data: {
        name: sanitizeString(name),
        phone: sanitizeString(phone),
        email: sanitizeString(email || ""),
        serviceType: sanitizeString(serviceType || ""),
        buildingType: sanitizeString(buildingType || ""),
        area: sanitizeString(area || ""),
        floors: floors || 1,
        location: sanitizeString(location || ""),
        message: sanitizeString(message || ""),
        status: "NEW",
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true, id: quoteRequest.id });
  } catch (error) {
    log.error("Error creating quote request:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الطلب" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const result = await requireVerifiedPermission(request as NextRequest, Permission.CLIENT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const requests = await db.quoteRequest.findMany({
      where: orgFilter(ctx),
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    log.error("Error fetching quote requests:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الطلبات" },
      { status: 500 }
    );
  }
}
