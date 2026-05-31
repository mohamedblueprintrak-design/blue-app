import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, siteVisitCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK - requires SITE_DIARY_READ permission
    const rbac = await requireVerifiedPermission(request, Permission.SITE_DIARY_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const municipality = searchParams.get("municipality");

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (municipality) where.municipality = municipality;

    const siteVisits = await db.siteVisit.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true, client: { select: { id: true, name: true, company: true } } },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(siteVisits);
  } catch (error) {
    log.error("Error fetching site visits:", error);
    return NextResponse.json({ error: "Failed to fetch site visits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // RBAC CHECK - requires SITE_DIARY_CREATE permission
    const rbac = await requireVerifiedPermission(request, Permission.SITE_DIARY_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();

    const validation = validateRequest(siteVisitCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const { projectId, date, plotNumber, municipality, gateDescription, neighborDesc, buildingDesc, status, photos, notes } = validation.data;

    const siteVisit = await db.siteVisit.create({
      data: {
        projectId,
        date: new Date(date),
        plotNumber: plotNumber || "",
        municipality: (municipality || "") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        gateDescription: gateDescription || "",
        neighborDesc: neighborDesc || "",
        buildingDesc: buildingDesc || "",
        status: (status || "DRAFT") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        photos: photos || "",
        notes: notes || "",
        ...orgCreate(ctx),
        createdById: ctx.userId,
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true, client: { select: { id: true, name: true, company: true } } },
        },
      },
    });

    return NextResponse.json(siteVisit, { status: 201 });
  } catch (error) {
    log.error("Error creating site visit:", error);
    return NextResponse.json({ error: "Failed to create site visit" }, { status: 500 });
  }
}
