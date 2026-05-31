import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { contractSchema } from '@/lib/validations';
import { sanitizeObject } from '@/lib/security/sanitize';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { log } from '@/lib/logger';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';

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
    const { page, limit } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;

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

    return NextResponse.json({ contracts, pagination: buildPaginationMeta(page, limit, total) });
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
    const body = sanitizeObject(rawBody);

    // Zod validation for contract fields
    const validation = contractSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
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
        type: (type || "ENGINEERING_SERVICES") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        status: (status || "DRAFT") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    log.error("Error creating contract:", error);
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    );
  }
}
