/**
 * BOQ (Bill of Quantities) API - Standalone CRUD
 * جدول الكميات - واجهة برمجة التطبيقات
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { requireVerifiedPermission, orgFilter } from '../utils/auth';
import { z } from 'zod';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

// Zod schemas for BOQ operations
const boqItemCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().max(50).optional().default(''),
  description: z.string().min(1, 'Description is required').max(500),
  unit: z.string().min(1, 'Unit is required').max(50),
  quantity: z.coerce.number().min(0, 'Quantity must be non-negative').max(999999),
  unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative').max(999999999),
  category: z.string().max(100).optional().default('civil'),
});

const boqItemUpdateSchema = z.object({
  id: z.string().cuid('Invalid ID'),
  code: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  unit: z.string().max(50).optional(),
  quantity: z.coerce.number().min(0).max(999999).optional(),
  unitPrice: z.coerce.number().min(0).max(999999999).optional(),
  category: z.string().max(100).optional(),
});

// GET - Fetch BOQ items (optionally filtered by project)
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
  if ('error' in rbac) return rbac.error;
  const auth = rbac.user;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { deletedAt: null };
    if (projectId) where.projectId = projectId;
    if (category) where.category = category;

    const cacheKey = buildCacheKey('boq', 'list', auth.organizationId || 'global', projectId || '', category || '');

    const result = await cachedQuery(cacheKey, async () => {
      const items = await db.bOQItem.findMany({
        where: { ...where, ...orgFilter(auth) },
        orderBy: [{ category: "asc" }, { code: "asc" }],
        select: {
          id: true,
          projectId: true,
          code: true,
          description: true,
          unit: true,
          quantity: true,
          unitPrice: true,
          total: true,
          category: true,
        },
      });

      // Calculate summary
      const summary = {
        total: items.reduce((sum, item) => sum + Number(item.total), 0),
        itemCount: items.length,
        byCategory: {} as Record<string, { count: number; total: number }>,
      };

      for (const item of items) {
        if (!summary.byCategory[item.category]) {
          summary.byCategory[item.category] = { count: 0, total: 0 };
        }
        summary.byCategory[item.category].count += 1;
        summary.byCategory[item.category].total += Number(item.total);
      }

      return { success: true, data: items, summary };
    }, CACHE_TTL.BOQ);

    return NextResponse.json(result);
  } catch (error) {
    log.error("Error fetching BOQ items:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch BOQ items" } },
      { status: 500 }
    );
  }
}

// POST - Create new BOQ item
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
  if ('error' in rbac) return rbac.error;
  const _auth = rbac.user;

  try {
    const rawBody = await request.json();

    // Zod validation for BOQ item creation
    const validation = boqItemCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: validation.error.issues[0].message } },
        { status: 400 }
      );
    }
    const { projectId, code, description, unit, quantity, unitPrice, category } = validation.data;

    const total = quantity * unitPrice;

    const item = await db.bOQItem.create({
      data: {
        projectId,
        code: code || "",
        description,
        unit,
        quantity,
        unitPrice,
        total,
        category: (category || "CIVIL"),
      },
    });

    // Invalidate BOQ cache after creation
    await invalidateCache('boq');

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    log.error("Error creating BOQ item:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to create BOQ item" } },
      { status: 500 }
    );
  }
}

// PUT - Update BOQ item
export async function PUT(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
  if ('error' in rbac) return rbac.error;
  const _auth = rbac.user;

  try {
    const rawBody = await request.json();

    // Zod validation for BOQ item update
    const validation = boqItemUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: validation.error.issues[0].message } },
        { status: 400 }
      );
    }
    const { id, ...data } = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.category !== undefined) updateData.category = data.category;

    // Recalculate total if quantity or unitPrice changed
    if (data.quantity !== undefined || data.unitPrice !== undefined) {
      const existing = await db.bOQItem.findUnique({ where: { id } });
      if (existing) {
        const qty: number = data.quantity !== undefined ? data.quantity : Number(existing.quantity);
        const price: number = data.unitPrice !== undefined ? data.unitPrice : Number(existing.unitPrice);
        updateData.total = qty * price;
      }
    }

    const item = await db.bOQItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    log.error("Error updating BOQ item:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to update BOQ item" } },
      { status: 500 }
    );
  }
}

// DELETE - Delete BOQ item
export async function DELETE(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
  if ('error' in rbac) return rbac.error;
  const _auth = rbac.user;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: "Item ID is required" } },
        { status: 400 }
      );
    }

    await db.bOQItem.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true, message: "BOQ item deleted successfully" });
  } catch (error) {
    log.error("Error deleting BOQ item:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to delete BOQ item" } },
      { status: 500 }
    );
  }
}
