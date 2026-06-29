import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

const createActivitySchema = z.object({
  type: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK', 'NOTE', 'WHATSAPP']),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  leadId: z.string().optional(),
  opportunityId: z.string().optional(),
  clientId: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId');
  const opportunityId = searchParams.get('opportunityId');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { ...orgFilter(ctx) };
  if (leadId) where.leadId = leadId;
  if (opportunityId) where.opportunityId = opportunityId;
  if (status) where.status = status;

  const activities = await db.cRMActivity.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ data: activities });
}

export async function POST(request: NextRequest) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const body = await request.json();
  const validation = createActivitySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  const data = validation.data;
  const activity = await db.cRMActivity.create({
    data: {
      type: data.type,
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      leadId: data.leadId || null,
      opportunityId: data.opportunityId || null,
      clientId: data.clientId || null,
      assignedToId: data.assignedToId || null,
      ...orgCreate(ctx),
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
