import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit-middleware";

/**
 * Public portal API — allows clients to look up their project by
 * project number + registered phone number (no JWT required).
 *
 * GET /api/portal?projectNumber=PRJ-2024-001&phone=0501234567&orgId=org_xxx
 *
 * SECURITY: The orgId parameter is REQUIRED in multi-tenant mode to prevent
 * cross-tenant data leakage. In single-tenant mode, it is optional and
 * defaults to the first (only) organization.
 *
 * Rate-limited with 'public' limiter to prevent brute-force phone+project lookups.
 */
export async function GET(request: NextRequest) {
  // Rate limit — public portal is susceptible to brute-force lookups
  const { allowed: _allowed, result } = await withRateLimit(request, 'public');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const projectNumber = searchParams.get("projectNumber")?.trim();
    const phone = searchParams.get("phone")?.trim();

    if (!projectNumber || !phone) {
      return NextResponse.json(
        { error: "projectNumber and phone are required" },
        { status: 400 }
      );
    }

    // SECURITY: In multi-tenant mode, require orgId to prevent cross-tenant data leakage.
    // In single-tenant mode, default to the first organization.
    const orgId = searchParams.get("orgId")?.trim();
    const isMultiTenant = process.env.MULTI_TENANT === 'true';
    let resolvedOrgId = orgId;

    if (!resolvedOrgId) {
      if (isMultiTenant) {
        return NextResponse.json(
          { error: "orgId is required in multi-tenant mode" },
          { status: 400 }
        );
      }
      // Single-tenant: use the first (only) organization
      const firstOrg = await db.organization.findFirst({ select: { id: true } });
      if (!firstOrg) {
        return NextResponse.json(
          { error: "Invalid project number or phone" },
          { status: 401 }
        );
      }
      resolvedOrgId = firstOrg.id;
    }

    // Step 1: Find client by phone number — SCOPED by organizationId to prevent cross-tenant leak
    const client = await db.client.findFirst({
      where: { phone, organizationId: resolvedOrgId },
      select: { id: true, name: true, nameEn: true, phone: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Invalid project number or phone" },
        { status: 401 }
      );
    }

    // Step 2: Find project by number + clientId
    const project = await db.project.findFirst({
      where: {
        number: projectNumber,
        clientId: client.id,
        deletedAt: null,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Invalid project number or phone" },
        { status: 401 }
      );
    }

    // Step 3: Fetch related data in parallel
    const [invoices, documents] = await Promise.all([
      db.invoice.findMany({
        where: { projectId: project.id, organizationId: project.organizationId, deletedAt: null },
        select: {
          id: true,
          number: true,
          issueDate: true,
          dueDate: true,
          total: true,
          paidAmount: true,
          remaining: true,
          status: true,
          items: {
            select: { description: true },
          },
        },
        orderBy: { issueDate: "desc" },
      }),
      db.document.findMany({
        where: { projectId: project.id, organizationId: project.organizationId },
        select: {
          id: true,
          name: true,
          category: true,
          fileType: true,
          createdAt: true,
          fileSize: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Shape the response for the portal — only expose what's needed
    const portalData = {
      project: {
        id: project.id,
        number: project.number,
        name: project.name,
        nameEn: project.nameEn,
        type: project.type,
        status: project.status,
        progress: project.progress,
        startDate: project.startDate,
        endDate: project.endDate,
        expectedEndDate: project.expectedEndDate,
        clientName: client.name,
        managerName: project.manager?.name || "",
      },
      invoices: invoices.map((inv: {
        id: string; number: string; issueDate: Date | null; dueDate: Date | null;
        total: { toNumber: () => number }; paidAmount: { toNumber: () => number };
        remaining: { toNumber: () => number }; status: string;
        items: { description: string | null }[];
      }) => ({
        id: inv.id,
        number: inv.number,
        date: inv.issueDate,
        dueDate: inv.dueDate,
        amount: inv.total.toNumber(),
        paidAmount: inv.paidAmount.toNumber(),
        status: mapInvoiceStatus(inv.status),
        description: inv.items[0]?.description || inv.number,
      })),
      documents: documents.map((doc: {
        id: string; name: string | null; category: string | null; fileType: string | null;
        createdAt: Date; fileSize: number | null;
      }) => ({
        id: doc.id,
        title: doc.name || 'Document',
        category: doc.category || "other",
        date: doc.createdAt,
        size: doc.fileSize ? formatFileSize(doc.fileSize) : "",
        type: doc.fileType || "other",
      })),
    };

    return NextResponse.json(portalData);
  } catch (error) {
    log.error("Error in portal API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function mapInvoiceStatus(status: string): string {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PARTIALLY_PAID":
      return "Partially Paid";
    case "OVERDUE":
      return "Overdue";
    case "DRAFT":
    case "SENT":
      return "Pending";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
