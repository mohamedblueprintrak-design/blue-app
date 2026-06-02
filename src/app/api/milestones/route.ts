import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { milestoneService } from '@/lib/services/milestone.service';
import { z } from 'zod';

// ============================================
// Zod Schemas
// ============================================

const milestoneCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Milestone name is required').max(500),
  description: z.string().max(5000).optional().default(''),
  amount: z.coerce.number().nonnegative('Amount must be non-negative').max(999999999),
  percentage: z.coerce.number().min(0).max(100).optional().default(0),
  dueDate: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

// ============================================
// GET — List milestones by project
// ============================================

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const milestones = await milestoneService.getMilestonesByProject(
      projectId,
      user.organizationId
    );

    const summary = await milestoneService.getMilestoneSummary(
      projectId,
      user.organizationId
    );

    log.info('Milestones listed', {
      projectId,
      milestoneCount: milestones.length,
      userId: user.userId,
    });

    return NextResponse.json({ milestones, summary });
  } catch (error) {
    log.error('Error fetching milestones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    );
  }
}

// ============================================
// POST — Create a new milestone
// ============================================

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const rawBody = await request.json();
    const validation = milestoneCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { projectId, name, description, amount, percentage, dueDate, order } = validation.data;

    try {
      const milestone = await milestoneService.createMilestone({
        projectId,
        name,
        description,
        amount,
        percentage,
        dueDate: dueDate || null,
        order,
        organizationId: user.organizationId,
        createdById: user.userId,
      });

      return NextResponse.json({ milestone }, { status: 201 });
    } catch (serviceError) {
      const message = serviceError instanceof Error ? serviceError.message : 'Failed to create milestone';
      const status = message.includes('not found') ? 404
        : message.includes('exceed 100%') ? 400
        : message.includes('Access denied') ? 403
        : 400;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    log.error('Error creating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    );
  }
}
