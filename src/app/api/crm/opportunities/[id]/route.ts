import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  stage: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  estimatedValue: z.number().optional(),
  expectedCloseDate: z.string().optional(),
  description: z.string().optional(),
  lostReason: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { id } = await params;
  const opportunity = await db.opportunity.findFirst({
    where: { id, ...orgFilter(ctx) },
    include: {
      lead: { select: { id: true, name: true, company: true } },
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!opportunity) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
  }

  return NextResponse.json(opportunity);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { id } = await params;
  const body = await request.json();
  const validation = updateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  const existing = await db.opportunity.findFirst({ where: { id, ...orgFilter(ctx) } });
  if (!existing) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
  }

  const data = validation.data;
  const updated = await db.opportunity.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.stage && { stage: data.stage }),
      ...(data.probability !== undefined && { probability: data.probability }),
      ...(data.estimatedValue !== undefined && { estimatedValue: data.estimatedValue }),
      ...(data.expectedCloseDate !== undefined && { expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.lostReason !== undefined && { lostReason: data.lostReason }),
      ...(data.clientId !== undefined && { clientId: data.clientId || null }),
      ...(data.projectId !== undefined && { projectId: data.projectId || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { id } = await params;
  const existing = await db.opportunity.findFirst({ where: { id, ...orgFilter(ctx) } });
  if (!existing) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
  }

  await db.opportunity.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
