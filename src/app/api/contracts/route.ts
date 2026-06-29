import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { contractSchema } from '@/lib/validations';
import { sanitizeObject } from '@/lib/security/sanitize';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { log } from '@/lib/logger';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { insensitiveContains } from '../utils/db';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

/**
 * @openapi
 * /api/contracts:
 *   get:
 *     tags: [Contracts]
 *     summary: List contracts
 *     description: Retrieve a paginated list of contracts scoped to the user's organization. Requires CONTRACT_READ permission.
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *       - name: status
 *         in: query
 *         schema: { type: string }
 *       - name: clientId
 *         in: query
 *         schema: { type: string }
 *       - name: projectId
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of contracts }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — CONTRACT_READ required }
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting — API limiter (100 req/min per IP)
    const { result: rlResult } = await withRateLimit(request, 'api');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CONTRACT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const { page, limit, search } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { number: insensitiveContains(search) },
        { title: insensitiveContains(search) },
        { client: { name: insensitiveContains(search) } },
        { project: { name: insensitiveContains(search) } },
      ];
    }

    const cacheKey = buildCacheKey('contracts', 'list', ctx.organizationId || 'global', `p${page}`, `l${limit}`, projectId || '', search || '');

    const { contracts, total } = await cachedQuery(cacheKey, async () => {
      const [contracts, total] = await Promise.all([
        db.contract.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          include: {
            client: {
              select: { id: true, name: true, company: true },
            },
            project: {
              select: { id: true, name: true, nameEn: true, number: true },
            },
            _count: {
              select: { amendments: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.contract.count({ where }),
      ]);
      return { contracts, total };
    }, CACHE_TTL.CONTRACTS);

    return NextResponse.json({ data: contracts, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error) {
    log.error("Error fetching contracts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CONTRACT_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const rawBody = await request.json();
    const validation = contractSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const _body = sanitizeObject(validation.data);
    const validatedData = validation.data;
    const {
      number,
      title,
      clientId,
      projectId,
      value,
      type,
      status,
      startDate,
      endDate,
    } = validatedData;

    const contract = await db.contract.create({
      data: {
        number: number || "",
        title,
        clientId,
        projectId,
        value: value ? parseFloat(value) : 0,
        type: type || "ENGINEERING_SERVICES",
        status: status || "DRAFT",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ...orgCreate(ctx),
        createdById: ctx.userId,
      },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        _count: {
          select: { amendments: true },
        },
      },
    });

    // Invalidate contract caches after creation
    await invalidateCache('contracts');

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    log.error("Error creating contract:", error);
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    );
  }
}