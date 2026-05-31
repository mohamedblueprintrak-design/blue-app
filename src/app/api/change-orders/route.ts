import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// Zod schema for change order creation
const changeOrderCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  number: z.string().min(1, 'Number is required').max(50),
  title: z.string().max(300).optional().default(''),
  type: z.string().max(50).default('change'),
  costImpact: z.coerce.number().min(0).max(999999999).optional().default(0),
  timeImpact: z.string().max(200).optional().default(''),
  description: z.string().max(5000).optional().default(''),
  amount: z.coerce.number().min(0).max(999999999).optional().default(0),
  status: z.string().max(50).default('PENDING'),
});

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.CHANGE_ORDER_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // ChangeOrder doesn't have organizationId directly; filter through project relationship
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const where: Record<string, unknown> = { deletedAt: null, ...orgWhere };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (type) where.type = type;

    const changeOrders = await db.changeOrder.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(changeOrders);
  } catch (error) {
    log.error("Error fetching change orders:", error);
    return NextResponse.json({ error: "Failed to fetch change orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.CHANGE_ORDER_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();

    // Zod validation for change order fields
    const validation = changeOrderCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { projectId, number, type, costImpact, timeImpact, description, status } = validation.data;

    const changeOrder = await db.changeOrder.create({
      data: {
        ...orgCreate(ctx),
        projectId,
        number,
        type: (type || "CHANGE") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        costImpact: costImpact || 0,
        timeImpact: timeImpact || "",
        description: description || "",
        status: (status || "PENDING") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(changeOrder, { status: 201 });
  } catch (error) {
    log.error("Error creating change order:", error);
    return NextResponse.json({ error: "Failed to create change order" }, { status: 500 });
  }
}
