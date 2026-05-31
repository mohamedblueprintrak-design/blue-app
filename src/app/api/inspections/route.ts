import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, inspectionCreateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INSPECTION_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get("riskLevel");
    const inspectionType = searchParams.get("inspectionType");
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (riskLevel) where.riskLevel = riskLevel;
    if (inspectionType) where.inspectionType = inspectionType;
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (projectId) where.projectId = projectId;

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const inspections = await db.buildingInspection.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        findings: true,
        _count: {
          select: { photos: true, findings: true },
        },
      },
      orderBy,
    });

    // Calculate stats (filtered by org)
    const allInspections = await db.buildingInspection.findMany({
      where: orgFilter(ctx) as Record<string, unknown>,
      select: { riskLevel: true, status: true },
    });

    const stats = {
      total: allInspections.length,
      green: allInspections.filter((i) => i.riskLevel === "GREEN").length,
      yellow: allInspections.filter((i) => i.riskLevel === "YELLOW").length,
      orange: allInspections.filter((i) => i.riskLevel === "ORANGE").length,
      red: allInspections.filter((i) => i.riskLevel === "RED").length,
      needsFollowup: allInspections.filter((i) => (i as Record<string, unknown>).status === "FOLLOWUP_NEEDED").length,
    };

    return NextResponse.json({ inspections, stats });
  } catch (error) {
    log.error("Error fetching inspections:", error);
    return NextResponse.json({ error: "Failed to fetch inspections" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INSPECTION_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();

    // Zod validation for inspection create fields
    const validation = validateRequest(inspectionCreateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const validatedData = validation.data;
    // findings is not part of the schema but may be passed for nested creation
    const findings = (rawBody as Record<string, unknown>)?.findings as Array<Record<string, unknown>> | undefined;
    const {
      projectId,
      clientId,
      buildingName,
      buildingAddress,
      inspectionType,
      riskLevel,
      inspectionDate,
      nextInspectionDate,
      inspectorName,
      summary,
      recommendations,
      repairEstimate,
      status,
    } = validatedData;

    // Generate inspection number
    const count = await db.buildingInspection.count();
    const inspectionNumber = `INS-${String(count + 1).padStart(4, "0")}`;

    // Calculate auto risk level based on findings if not provided
    let calculatedRiskLevel = riskLevel || "GREEN";
    if (findings && findings.length > 0 && !riskLevel) {
      const severities = findings.map((f: { severity?: string }) => f.severity || "LOW");
      if (severities.includes("CRITICAL")) calculatedRiskLevel = "RED";
      else if (severities.includes("HIGH")) calculatedRiskLevel = "ORANGE";
      else if (severities.includes("MEDIUM")) calculatedRiskLevel = "YELLOW";
      else calculatedRiskLevel = "GREEN";
    }

    // Calculate total repair estimate from findings
    let totalRepair = repairEstimate || 0;
    if (findings && findings.length > 0 && !repairEstimate) {
      totalRepair = findings.reduce((sum: number, f: { estimatedCost?: number }) => sum + (f.estimatedCost || 0), 0);
    }

    const inspection = await db.buildingInspection.create({
      data: {
        inspectionNumber,
        projectId: projectId || null,
        clientId: clientId || null,
        buildingName: buildingName || "",
        buildingAddress: buildingAddress || "",
        inspectionType: inspectionType || "",
        riskLevel: calculatedRiskLevel,
        inspectionDate: new Date(inspectionDate),
        nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
        inspectorName: inspectorName || "",
        summary: summary || "",
        recommendations: recommendations || "",
        repairEstimate: totalRepair,
        status: (status || "DRAFT") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ...orgCreate(ctx),
        createdById: ctx.userId,
        findings: findings
          ? {
              create: findings.map((f: Record<string, unknown>) => ({
                location: (f.location as string) || "",
                description: (f.description as string) || "",
                severity: (f.severity as string) || "LOW",
                category: (f.category as string) || "",
                photos: (f.photos as string) || "",
                remediation: (f.remediation as string) || "",
                estimatedCost: (f.estimatedCost as number) || 0,
                status: (f.status as string) || "OPEN",
              })),
            }
          : undefined,
      },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        findings: true,
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    log.error("Error creating inspection:", error);
    return NextResponse.json({ error: "Failed to create inspection" }, { status: 500 });
  }
}
