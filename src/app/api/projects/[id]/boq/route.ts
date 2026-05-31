import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';
import { validateIdParam } from '@/lib/api-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id }, select: { organizationId: true } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.organizationId && project.organizationId && project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const items = await db.bOQItem.findMany({
      where: { projectId: id },
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    const summary = {
      total: items.reduce((sum, item) => sum + Number(item.total), 0),
      byCategory: {} as Record<string, { count: number; total: number }>,
    };

    for (const item of items) {
      if (!summary.byCategory[item.category]) {
        summary.byCategory[item.category] = { count: 0, total: 0 };
      }
      summary.byCategory[item.category].count += 1;
      summary.byCategory[item.category].total += Number(item.total);
    }

    return NextResponse.json({ items, summary });
  } catch (error) {
    log.error("Error fetching BOQ items:", error);
    return NextResponse.json(
      { error: "Failed to fetch BOQ items" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id }, select: { organizationId: true } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.organizationId && project.organizationId && project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { code, description, unit, quantity, unitPrice, category } = body;

    if (!code || !description || !unit || quantity === undefined || unitPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const total = quantity * unitPrice;

    const item = await db.bOQItem.create({
      data: {
        projectId: id,
        code,
        description,
        unit,
        quantity,
        unitPrice,
        total,
        category: category || "CIVIL",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    log.error("Error creating BOQ item:", error);
    return NextResponse.json(
      { error: "Failed to create BOQ item" },
      { status: 500 }
    );
  }
}
