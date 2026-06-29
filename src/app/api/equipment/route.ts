import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip, isPaginationRequested } from '../utils/pagination';
import { cachedQuery, invalidateCache, CACHE_TTL } from '@/lib/cache/query-cache';

// Zod schema for equipment creation
const equipmentCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  projectId: z.string().max(100).optional().default(''),
  type: z.string().max(100).optional().default(''),
  model: z.string().max(200).optional().default(''),
  serialNumber: z.string().max(100).optional().default(''),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED']).default('AVAILABLE'),
  location: z.string().max(300).optional().default(''),
  quantity: z.coerce.number().min(0).max(99999).optional().default(1),
  dailyRate: z.coerce.number().min(0).max(999999999).optional().default(0),
  lastMaintenance: z.string().optional().default(''),
  nextMaintenance: z.string().optional().default(''),
});

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };

    if (status && status !== "all") {
      where.status = status;
    }
    if (type && type !== "all") {
      where.type = type;
    }

    const usePagination = isPaginationRequested(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const cacheKey = `equipment:${ctx.organizationId || 'none'}:${status || 'all'}:${type || 'all'}:${page}:${limit}`;

    if (usePagination) {
      const [equipment, total] = await cachedQuery(cacheKey, () => Promise.all([
        db.equipment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.equipment.count({ where }),
      ]), CACHE_TTL.DEFAULT);

      // Summary stats
      const allEquipment = await cachedQuery(`equipment-stats:${ctx.organizationId || 'none'}`, () =>
        db.equipment.findMany({ where: { deletedAt: null, ...orgFilter(ctx) }, select: { status: true } }),
      CACHE_TTL.DEFAULT);
      const totalEquipment = allEquipment.length;
      const availableCount = allEquipment.filter((e) => e.status === "AVAILABLE").length;
      const inUseCount = allEquipment.filter((e) => e.status === "IN_USE").length;
      const maintenanceCount = allEquipment.filter((e) => e.status === "MAINTENANCE").length;

      return NextResponse.json({ data: equipment, pagination: buildPaginationMeta(page, limit, total), summary: { totalEquipment, availableCount, inUseCount, maintenanceCount } });
    }

    const equipment = await cachedQuery(cacheKey, () =>
      db.equipment.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
    CACHE_TTL.DEFAULT);

    // Summary stats
    const totalEquipment = equipment.length;
    const availableCount = equipment.filter((e) => e.status === "AVAILABLE").length;
    const inUseCount = equipment.filter((e) => e.status === "IN_USE").length;
    const maintenanceCount = equipment.filter((e) => e.status === "MAINTENANCE").length;

    return NextResponse.json({
      equipment,
      summary: { totalEquipment, availableCount, inUseCount, maintenanceCount },
    });
  } catch (error) {
    log.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.INVENTORY_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();

    // Zod validation for equipment fields
    const validation = equipmentCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const {
      name,
      type,
      model,
      serialNumber,
      status,
      location,
      dailyRate,
      lastMaintenance,
      nextMaintenance,
    } = validation.data;

    const equip = await db.equipment.create({
      data: {
        name,
        type: type || "",
        model: model || "",
        serialNumber: serialNumber || "",
        status: status || "AVAILABLE",
        location: location || "",
        dailyRate: dailyRate || 0,
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null,
        nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
        ...orgCreate(ctx),
      },
    });

    await invalidateCache('equipment');
    return NextResponse.json(equip, { status: 201 });
  } catch (error) {
    log.error("Error creating equipment:", error);
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 }
    );
  }
}
