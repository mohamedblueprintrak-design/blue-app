import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, budgetUpdateSchema } from '@/lib/api-validation';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC CHECK - requires BUDGET_MANAGE permission
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const budget = await db.budget.findFirst({
      where: { id, deletedAt: null, project: { ...orgFilter(ctx) } },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        parent: { select: { id: true, name: true } },
        children: {
          include: {
            project: { select: { id: true, name: true, nameEn: true, number: true } },
          },
        },
      },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json(budget);
  } catch (error) {
    log.error("Error fetching budget:", error);
    return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);
    // Zod validation for update fields
    const validation = validateRequest(budgetUpdateSchema, sanitizedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { name, category, planned, actual, committed, remaining, deviation } = validation.data;

    const existing = await db.budget.findFirst({ where: { id, project: { ...orgFilter(ctx) } } });
    if (!existing) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const plannedVal = planned !== undefined ? parseFloat(String(planned)) : Number(existing.planned);
    const actualVal = actual !== undefined ? parseFloat(String(actual)) : Number(existing.actual);
    const committedVal = committed !== undefined ? parseFloat(String(committed)) : Number(existing.committed);
    const remainingVal = remaining !== undefined ? parseFloat(String(remaining)) : plannedVal - actualVal - committedVal;
    const deviationVal = deviation !== undefined ? parseFloat(String(deviation)) : (plannedVal > 0 ? ((actualVal - plannedVal) / plannedVal) * 100 : 0);

    const budget = await db.budget.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        category: category !== undefined ? category : existing.category,
        planned: plannedVal,
        actual: actualVal,
        committed: committedVal,
        remaining: remainingVal,
        deviation: deviationVal,
      },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        children: {
          include: {
            project: { select: { id: true, name: true, nameEn: true, number: true } },
          },
        },
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    log.error("Error updating budget:", error);
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const existing = await db.budget.findFirst({ where: { id, project: { ...orgFilter(ctx) } } });
    if (!existing) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }
    // Soft delete children and parent in a single transaction
    await db.$transaction([
      db.budget.updateMany({ where: { parentId: id, project: { ...orgFilter(ctx) } }, data: { deletedAt: new Date() } }),
      db.budget.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting budget:", error);
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }
}
