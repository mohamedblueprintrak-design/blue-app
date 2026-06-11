import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, approvalCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgCreate} from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { insensitiveContains } from '../utils/db';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

// GET: List all approvals with optional filtering
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.APPROVAL_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');
    const projectId = searchParams.get('projectId');
    const { page, limit, search } = parsePaginationParams(searchParams);

    // Approval doesn't have organizationId directly; filter through project relationship
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const where: Record<string, unknown> = { ...orgWhere };
    if (status && status !== 'all') where.status = status;
    if (entityType && entityType !== 'all') where.entityType = entityType;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: insensitiveContains(search) },
        { entityType: insensitiveContains(search) },
        { description: insensitiveContains(search) },
      ];
    }

    const cacheKey = buildCacheKey('approvals', 'list', ctx.organizationId || 'global', status || '', entityType || '', projectId || '', `p${page}`, `l${limit}`, search || '');

    const { approvals, total } = await cachedQuery(cacheKey, async () => {
      const [approvals, total] = await Promise.all([
        db.approval.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.approval.count({ where }),
      ]);
      return { approvals, total };
    }, CACHE_TTL.APPROVALS);

    return NextResponse.json({ data: approvals, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error) {
    log.error('Error fetching approvals:', error);
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
}

// POST: Create a new approval request
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.APPROVAL_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await validateBody(request, approvalCreateSchema);
    if (body instanceof NextResponse) return body;
    const { entityType, entityId, title, description, requestedBy, assignedTo, step, totalSteps, amount } = body;

    const approval = await db.approval.create({
      data: {
        entityType,
        entityId,
        title,
        description: description || '',
        requestedBy: requestedBy || '',
        assignedTo: assignedTo || '',
        step: step || 1,
        totalSteps: totalSteps || 1,
        amount: amount || 0,
        ...orgCreate(ctx),
      },
    });

    // Invalidate approval caches after creation
    await invalidateCache('approvals');

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    log.error('Error creating approval:', error);
    return NextResponse.json({ error: 'Failed to create approval' }, { status: 500 });
  }
}
