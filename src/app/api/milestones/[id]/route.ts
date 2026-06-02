import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { milestoneService } from '@/lib/services/milestone.service';
import { z } from 'zod';

// ============================================
// Zod Schemas
// ============================================

const milestoneUpdateSchema = z.object({
  name: z.string().min(1, 'Milestone name is required').max(500).optional(),
  description: z.string().max(5000).optional(),
  amount: z.coerce.number().nonnegative('Amount must be non-negative').max(999999999).optional(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['pending', 'invoiced', 'partially_paid', 'paid', 'overdue', 'cancelled']).optional(),
  order: z.number().int().optional(),
  invoiceId: z.string().nullable().optional(),
});

// ============================================
// GET — Get single milestone details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const id = idCheck.id;

    const milestone = await milestoneService.getMilestoneById(id, user.organizationId);
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    log.info('Milestone detail fetched', { milestoneId: id, userId: user.userId });

    return NextResponse.json({ milestone });
  } catch (error) {
    log.error('Error fetching milestone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch milestone' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT — Update a milestone
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const id = idCheck.id;

    const rawBody = await request.json();
    const validation = milestoneUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    try {
      const milestone = await milestoneService.updateMilestone(
        id,
        validation.data,
        user.userId,
        user.organizationId
      );

      return NextResponse.json({ milestone });
    } catch (serviceError) {
      const message = serviceError instanceof Error ? serviceError.message : 'Failed to update milestone';
      const status = message.includes('not found') ? 404
        : message.includes('exceed 100%') ? 400
        : message.includes('Cannot change status') ? 400
        : message.includes('Invalid') ? 400
        : 400;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    log.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE — Soft delete a milestone
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_DELETE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const id = idCheck.id;

    try {
      const result = await milestoneService.deleteMilestone(
        id,
        user.userId,
        user.organizationId
      );

      return NextResponse.json(result);
    } catch (serviceError) {
      const message = serviceError instanceof Error ? serviceError.message : 'Failed to delete milestone';
      const status = message.includes('not found') ? 404
        : message.includes('Cannot delete') ? 400
        : 400;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    log.error('Error deleting milestone:', error);
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    );
  }
}
