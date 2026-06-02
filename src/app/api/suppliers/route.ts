import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateBody, supplierCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip, isPaginationRequested } from '../utils/pagination';
import { cachedQuery, invalidateCache, CACHE_TTL } from '@/lib/cache/query-cache';

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.SUPPLIER_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (category && category !== "all") {
      where.category = category;
    }

    const usePagination = isPaginationRequested(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const cacheKey = `suppliers:${ctx.organizationId || 'none'}:${category || 'all'}:${page}:${limit}`;

    if (usePagination) {
      const [suppliers, total] = await cachedQuery(cacheKey, () => Promise.all([
        db.supplier.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          include: {
            _count: {
              select: { purchaseOrders: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.supplier.count({ where: Object.keys(where).length > 0 ? where : undefined }),
      ]), CACHE_TTL.CLIENTS);

      return NextResponse.json({ data: suppliers, pagination: buildPaginationMeta(page, limit, total) });
    }

    const suppliers = await cachedQuery(cacheKey, () =>
      db.supplier.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    CACHE_TTL.CLIENTS);

    return NextResponse.json(suppliers);
  } catch (error) {
    log.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.SUPPLIER_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await validateBody(request, supplierCreateSchema);
    if (body instanceof NextResponse) return body;
    const { name, category, email, phone, address, rating, creditLimit } = body;

    const supplier = await db.supplier.create({
      data: {
        name,
        category: (category || "MATERIALS"),
        email: email || "",
        phone: phone || "",
        address: address || "",
        rating: rating || 0,
        creditLimit: creditLimit || 0,
        ...orgCreate(ctx),
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    await invalidateCache('suppliers');
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    log.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
