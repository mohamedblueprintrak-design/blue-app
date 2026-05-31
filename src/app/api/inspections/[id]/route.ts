import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, inspectionUpdateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INSPECTION_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const inspection = await db.buildingInspection.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        client: {
          select: { id: true, name: true, company: true, email: true, phone: true },
        },
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        findings: {
          orderBy: { createdAt: "asc" },
        },
        photos: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    return NextResponse.json(inspection);
  } catch (error) {
    log.error("Error fetching inspection:", error);
    return NextResponse.json({ error: "Failed to fetch inspection" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INSPECTION_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before update
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.buildingInspection.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(inspectionUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const {
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
      findings,
    } = body;

    // If findings are provided, we need to delete existing and recreate
    if (findings !== undefined) {
      await db.inspectionFinding.deleteMany({ where: { inspectionId: id } });
    }

    // Recalculate risk level based on findings
    let calculatedRiskLevel = riskLevel;
    if (findings && findings.length > 0 && !riskLevel) {
      const severities = findings.map((f: { severity?: string }) => f.severity || "LOW");
      if (severities.includes("CRITICAL")) calculatedRiskLevel = "red";
      else if (severities.includes("HIGH")) calculatedRiskLevel = "orange";
      else if (severities.includes("MEDIUM")) calculatedRiskLevel = "yellow";
      else calculatedRiskLevel = "green";
    }

    const inspection = await db.buildingInspection.update({
      where: { id },
      data: {
        ...(buildingName !== undefined && { buildingName }),
        ...(buildingAddress !== undefined && { buildingAddress }),
        ...(inspectionType !== undefined && { inspectionType }),
        ...(calculatedRiskLevel !== undefined && { riskLevel: calculatedRiskLevel }),
        ...(inspectionDate !== undefined && { inspectionDate: new Date(inspectionDate) }),
        ...(nextInspectionDate !== undefined && {
          nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
        }),
        ...(inspectorName !== undefined && { inspectorName }),
        ...(summary !== undefined && { summary }),
        ...(recommendations !== undefined && { recommendations }),
        ...(repairEstimate !== undefined && { repairEstimate }),
        ...(status !== undefined && { status }),
        ...(findings !== undefined && {
          findings: {
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
          },
        }),
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

    return NextResponse.json(inspection);
  } catch (error) {
    log.error("Error updating inspection:", error);
    return NextResponse.json({ error: "Failed to update inspection" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.INSPECTION_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.buildingInspection.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    await db.buildingInspection.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting inspection:", error);
    return NextResponse.json({ error: "Failed to delete inspection" }, { status: 500 });
  }
}
