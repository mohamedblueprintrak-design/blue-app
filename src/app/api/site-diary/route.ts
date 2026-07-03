import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
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
    // RBAC CHECK - requires SITE_DIARY_READ permission
    const rbac = await requireVerifiedPermission(request, Permission.SITE_DIARY_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;

    const usePagination = isPaginationRequested(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const cacheKey = `site-diaries:${ctx.organizationId || 'none'}:${projectId || 'all'}:${page}:${limit}`;

    if (usePagination) {
      const [diaries, total] = await cachedQuery(cacheKey, () => Promise.all([
        db.siteDiary.findMany({
          where,
          include: {
            project: {
              select: { id: true, name: true, nameEn: true, number: true },
            },
          },
          orderBy: { date: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.siteDiary.count({ where }),
      ]), CACHE_TTL.SITE_DIARY);

      return NextResponse.json({ data: diaries, pagination: buildPaginationMeta(page, limit, total) });
    }

    const diaries = await cachedQuery(cacheKey, () =>
      db.siteDiary.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true, nameEn: true, number: true },
          },
        },
        orderBy: { date: "desc" },
      }),
    CACHE_TTL.SITE_DIARY);

    return NextResponse.json(diaries);
  } catch (error) {
    log.error("Error fetching site diaries:", error);
    return NextResponse.json({ error: "Failed to fetch site diaries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK - requires SITE_DIARY_CREATE permission
    const rbac = await requireVerifiedPermission(request, Permission.SITE_DIARY_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();

    const { projectId, date, weather, workerCount, workDescription, issues, safetyNotes, equipment, materials, photos } = body;
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }

    const diary = await db.siteDiary.create({
      data: {
        projectId,
        date: new Date(date),
        weather: weather || "",
        workerCount: workerCount ? parseInt(String(workerCount), 10) : 0,
        workDescription: workDescription || "",
        issues: issues || "",
        safetyNotes: safetyNotes || "",
        equipment: equipment || "",
        materials: materials || "",
        photos: photos || "",
        ...orgCreate(ctx),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    await invalidateCache('site-diaries');
    return NextResponse.json(diary, { status: 201 });
  } catch (error) {
    log.error("Error creating site diary:", error);
    return NextResponse.json({ error: "Failed to create site diary" }, { status: 500 });
  }
}
