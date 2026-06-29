import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { z } from 'zod';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip, isPaginationRequested } from '../utils/pagination';
import { cachedQuery, invalidateCache, CACHE_TTL } from '@/lib/cache/query-cache';

// Zod schema for risk creation
const riskCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional().default(''),
  category: z.enum(['TECHNICAL', 'FINANCIAL', 'SCHEDULE', 'RESOURCE', 'EXTERNAL', 'REGULATORY', 'ENVIRONMENTAL', 'QUALITY']).default('TECHNICAL'),
  probability: z.coerce.number().min(1).max(5).default(3),
  impact: z.coerce.number().min(1).max(5).default(3),
  mitigationPlan: z.string().max(5000).optional().default(''),
  strategy: z.enum(['MITIGATE', 'AVOID', 'TRANSFER', 'ACCEPT']).default('MITIGATE'),
  status: z.string().max(50).default('OPEN'),
  assigneeId: z.string().max(100).optional().default(''),
  actions: z.array(z.object({
    description: z.string().max(2000).optional().default(''),
    assigneeId: z.string().max(100).optional().default(''),
    dueDate: z.string().optional().default(''),
  })).optional(),
});

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.RISK_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;

    const usePagination = isPaginationRequested(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const cacheKey = `risks:${ctx.organizationId || 'none'}:${projectId || 'all'}:${page}:${limit}`;

    if (usePagination) {
      const [risks, total] = await cachedQuery(cacheKey, () => Promise.all([
        db.risk.findMany({
          where,
          include: {
            project: {
              select: { id: true, name: true, nameEn: true, number: true },
            },
            actions: {
              include: {
                assignee: {
                  select: { id: true, name: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.risk.count({ where }),
      ]), CACHE_TTL.DEFAULT);

      return NextResponse.json({ data: risks, pagination: buildPaginationMeta(page, limit, total) });
    }

    const risks = await cachedQuery(cacheKey, () =>
      db.risk.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true, nameEn: true, number: true },
          },
          actions: {
            include: {
              assignee: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    CACHE_TTL.DEFAULT);

    return NextResponse.json(risks);
  } catch (error) {
    log.error("Error fetching risks:", error);
    return NextResponse.json({ error: "Failed to fetch risks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.RISK_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();
    const validation = riskCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const _sanitizedBody = sanitizeObject(validation.data);
    const {
      projectId,
      title,
      category,
      probability,
      impact,
      mitigationPlan,
      strategy,
      status,
      assigneeId,
    } = validation.data;

    const prob = Number(probability) || 3;
    const imp = Number(impact) || 3;

    // Prepare action items for creation
    const actionsData = (validation.data.actions || []).map(
      (action) => ({
        description: action.description || "",
        assigneeId: action.assigneeId || null,
        dueDate: action.dueDate ? new Date(action.dueDate) : null,
        completed: false,
        organizationId: ctx.organizationId || '',
      })
    );

    // If assigneeId is provided directly, add as first action
    if (assigneeId && actionsData.length === 0) {
      actionsData.push({
        description: title || "",
        assigneeId,
        dueDate: null,
        completed: false,
        organizationId: ctx.organizationId || '',
      });
    }

    const risk = await db.risk.create({
      data: {
        projectId,
        title: title || "",
        category: (category || "TECHNICAL"),
        probability: prob,
        impact: imp,
        score: prob * imp,
        mitigationPlan: mitigationPlan || "",
        strategy: strategy || "MITIGATE",
        status: (status || "OPEN"),
        ...orgCreate(ctx),
        createdById: ctx.userId,
        actions: {
          create: actionsData,
        },
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        actions: {
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    await invalidateCache('risks');
    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    log.error("Error creating risk:", error);
    return NextResponse.json({ error: "Failed to create risk" }, { status: 500 });
  }
}
