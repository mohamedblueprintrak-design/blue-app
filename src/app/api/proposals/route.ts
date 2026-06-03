import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, proposalSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { VAT_RATE } from '@/lib/constants';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip, isPaginationRequested } from '../utils/pagination';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.PROPOSAL_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const usePagination = isPaginationRequested(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);

    const cacheKey = buildCacheKey('proposals', 'list', ctx.organizationId || 'global', `p${page}`, `l${limit}`, status || '', projectId || '');

    const cachedData = await cachedQuery(cacheKey, async () => {
      if (usePagination) {
        const [proposals, total] = await Promise.all([
          db.proposal.findMany({
            where: Object.keys(where).length > 0 ? where : undefined,
            include: {
              client: { select: { id: true, name: true, company: true } },
              project: { select: { id: true, name: true, nameEn: true, number: true } },
              items: { orderBy: { createdAt: "asc" } },
            },
            orderBy: { createdAt: "desc" },
            skip: calculateSkip(page, limit),
            take: limit,
          }),
          db.proposal.count({ where: Object.keys(where).length > 0 ? where : undefined }),
        ]);
        return { type: 'paginated' as const, proposals, total };
      }

      const proposals = await db.proposal.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          client: { select: { id: true, name: true, company: true } },
          project: { select: { id: true, name: true, nameEn: true, number: true } },
          items: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });
      return { type: 'all' as const, proposals };
    }, CACHE_TTL.PROPOSALS);

    if (cachedData.type === 'paginated') {
      return NextResponse.json({ data: cachedData.proposals, pagination: buildPaginationMeta(page, limit, cachedData.total) });
    }

    return NextResponse.json(cachedData.proposals);
  } catch (error) {
    log.error("Error fetching proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.PROPOSAL_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();

    const validation = validateRequest(proposalSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const { number, clientId, projectId, status } = validation.data;
    const items = (body as any).items;
    const notes = (body as any).notes;

    const lineItems = items || [];
    const subtotal = lineItems.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * VAT_RATE;
    const total = subtotal + tax;

    const proposal = await db.proposal.create({
      data: {
        number: number || "",
        clientId,
        projectId: projectId || null,
        status: status || "DRAFT",
        subtotal,
        tax,
        total,
        notes: notes || "",
        ...orgCreate(ctx),
        createdById: ctx.userId,
        items: {
          create: lineItems.map((item: { description: string; quantity: number; unitPrice: number; total: number }) => ({
            description: item.description || "",
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            total: item.total || (item.quantity * item.unitPrice),
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    // Invalidate proposal caches after creation
    await invalidateCache('proposals');

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    log.error("Error creating proposal:", error);
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}
