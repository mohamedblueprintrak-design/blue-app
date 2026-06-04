import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { validateRequest, budgetCreateSchema } from '@/lib/api-validation';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { insensitiveContains } from '../utils/db';

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK - requires BUDGET_MANAGE permission
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const { page, limit, search } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = { deletedAt: null, parentId: null, ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { name: insensitiveContains(search) },
        { category: insensitiveContains(search) },
        { project: { name: insensitiveContains(search) } },
      ];
    }

    const cacheKey = buildCacheKey('budgets', 'list', ctx.organizationId || 'global', projectId || '', `p${page}`, `l${limit}`, search || '');

    const { budgets, total } = await cachedQuery(cacheKey, async () => {
      const [budgets, total] = await Promise.all([
        db.budget.findMany({
          where,
          include: {
            project: { select: { id: true, name: true, nameEn: true, number: true } },
            children: {
              include: {
                project: { select: { id: true, name: true, nameEn: true, number: true } },
              },
            },
          },
          orderBy: [{ category: "asc" }, { createdAt: "asc" }],
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.budget.count({ where }),
      ]);
      return { budgets, total };
    }, CACHE_TTL.BUDGETS);

    return NextResponse.json({ data: budgets, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error) {
    log.error("Error fetching budgets:", error);
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const rawBody = await request.json();
    const validation = validateRequest(budgetCreateSchema, rawBody);

    // Zod validation for budget create fields
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const body = sanitizeObject(validation.data);
    const validatedData = validation.data;
    const { projectId, parentId, name, category, planned, actual, committed } = validatedData;

    const plannedVal = planned || 0;
    const actualVal = actual || 0;
    const committedVal = committed || 0;
    const remainingVal = plannedVal - actualVal - committedVal;
    const deviationVal = plannedVal > 0 ? ((actualVal - plannedVal) / plannedVal) * 100 : 0;

    const budget = await db.budget.create({
      data: {
        projectId,
        parentId: parentId || null,
        name,
        category,
        planned: plannedVal,
        actual: actualVal,
        committed: committedVal,
        remaining: remainingVal,
        deviation: deviationVal,
        ...orgCreate(ctx),
        createdById: ctx.userId,
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

    // Invalidate budget caches after creation
    await invalidateCache('budgets');

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    log.error("Error creating budget:", error);
    return NextResponse.json({ error: "Failed to create budget" }, { status: 500 });
  }
}
