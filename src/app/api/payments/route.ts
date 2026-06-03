import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, paymentCreateSchema } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { insensitiveContains } from '../utils/db';
import { sanitizeObject } from '@/lib/security/sanitize';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';
import { cacheGet, cacheSet } from '@/lib/cache/redis';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(request: NextRequest) {
  try {
    const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
    const blocked = rateLimitResponse(rlResult);
    if (blocked) return blocked;

    // RBAC CHECK (JWT-verified for payments)
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const { page, limit, search } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { beneficiary: insensitiveContains(search) },
        { referenceNumber: insensitiveContains(search) },
        { voucherNumber: insensitiveContains(search) },
        { project: { name: insensitiveContains(search) } },
      ];
    }

    const cacheKey = buildCacheKey('payments', 'list', ctx.organizationId || 'global', `p${page}`, `l${limit}`, status || '', projectId || '', search || '');

    const { payments, total } = await cachedQuery(cacheKey, async () => {
      const [payments, total] = await Promise.all([
        db.payment.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          include: {
            approver: { select: { id: true, name: true } },
            project: { select: { id: true, name: true, nameEn: true, number: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.payment.count({ where }),
      ]);
      return { payments, total };
    }, CACHE_TTL.PAYMENTS);

    return NextResponse.json({ data: payments, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error) {
    log.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'strict');
    const blocked = rateLimitResponse(rlResult);
    if (blocked) return blocked;

    // RBAC CHECK (JWT-verified for payments)
    const rbac = await requireVerifiedPermission(request, Permission.PAYMENT_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);

    // Zod validation for payment fields
    const validation = validateRequest(paymentCreateSchema, sanitizedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const { voucherNumber, projectId, amount, payMethod, beneficiary, referenceNumber, description } = validation.data;

    // Idempotency / Double-charge prevention
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      const redisKey = `idempotency:payment:${ctx.userId}:${idempotencyKey}`;
      const cachedResult = await cacheGet(redisKey);
      if (cachedResult) {
        log.info("Idempotency key hit. Returning cached payment response.", { userId: ctx.userId, idempotencyKey });
        return NextResponse.json(cachedResult, { status: 200 });
      }
    }
    
    // Check for exact duplicate payment within the last 2 minutes (prevents double-clicks)
    const recentDuplicate = await db.payment.findFirst({
      where: {
        createdById: ctx.userId,
        amount,
        projectId: projectId || null,
        beneficiary: beneficiary || "",
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      }
    });

    if (recentDuplicate) {
      log.warn("Prevented double-charge (time-based)", { userId: ctx.userId, amount, projectId });
      return NextResponse.json(recentDuplicate, { status: 200 });
    }

    const payment = await db.payment.create({
      data: {
        voucherNumber: voucherNumber || "",
        projectId: projectId || null,
        amount,
        payMethod: payMethod,
        beneficiary: beneficiary || "",
        referenceNumber: referenceNumber || "",
        description: description || "",
        ...orgCreate(ctx),
        createdById: ctx.userId,
      },
      include: {
        approver: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    // Invalidate payment caches after creation
    await invalidateCache('payments');

    if (idempotencyKey) {
      const redisKey = `idempotency:payment:${ctx.userId}:${idempotencyKey}`;
      // Cache the result for 24 hours (86400 seconds)
      await cacheSet(redisKey, payment, 86400);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    log.error("Error creating payment:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
