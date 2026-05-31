import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, approvalCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter} from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';

// GET: List all approvals with optional filtering
export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.APPROVAL_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');

    const projectId = searchParams.get('projectId');

    // Approval doesn't have organizationId directly; filter through project relationship
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const where: Record<string, unknown> = { ...orgWhere };
    if (status && status !== 'all') where.status = status;
    if (entityType && entityType !== 'all') where.entityType = entityType;
    if (projectId) where.projectId = projectId;

    const approvals = await db.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(approvals);
  } catch (error) {
    log.error('Error fetching approvals:', error);
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
}

// POST: Create a new approval request
export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.APPROVAL_CREATE);
    if ('error' in result) return result.error;
    const _ctx = result.user;

    const body = await validateBody(request, approvalCreateSchema);
    if (body instanceof NextResponse) return body;
    const { entityType, entityId, title, description, requestedBy, assignedTo, step, totalSteps, amount } = body;

    const approval = await db.approval.create({
      data: {
        entityType,
        entityId,
        title,
        description: description || '',
        requestedBy,
        assignedTo,
        step: step || 1,
        totalSteps: totalSteps || 1,
        amount: amount || 0,
      },
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    log.error('Error creating approval:', error);
    return NextResponse.json({ error: 'Failed to create approval' }, { status: 500 });
  }
}
