import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

const createOpportunitySchema = z.object({
  title: z.string().min(1).max(300),
  leadId: z.string().optional(),
  stage: z.string().default('QUALIFICATION'),
  probability: z.number().min(0).max(100).default(10),
  estimatedValue: z.number().default(0),
  expectedCloseDate: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const opportunities = await db.opportunity.findMany({
    where: { ...orgFilter(ctx), deletedAt: null },
    include: { lead: { select: { id: true, name: true, company: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: opportunities });
}

export async function POST(request: NextRequest) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const body = await request.json();
  const validation = createOpportunitySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  const data = validation.data;
  const opportunity = await db.opportunity.create({
    data: {
      title: data.title,
      leadId: data.leadId || null,
      stage: data.stage,
      probability: data.probability,
      estimatedValue: data.estimatedValue,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      description: data.description || null,
      ...orgCreate(ctx),
    },
  });

  return NextResponse.json(opportunity, { status: 201 });
}
