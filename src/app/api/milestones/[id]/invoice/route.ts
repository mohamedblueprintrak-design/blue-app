import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { milestoneService } from '@/lib/services/milestone.service';

// ============================================
// POST — Generate invoice from milestone
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const milestoneId = idCheck.id;

    try {
      const invoice = await milestoneService.generateInvoiceFromMilestone(
        milestoneId,
        user.userId,
        user.organizationId
      );

      log.info('Invoice generated from milestone via API', {
        invoiceId: invoice.id,
        milestoneId,
        userId: user.userId,
      });

      return NextResponse.json({ invoice }, { status: 201 });
    } catch (serviceError) {
      const message = serviceError instanceof Error ? serviceError.message : 'Failed to generate invoice';
      const status = message.includes('not found') ? 404
        : message.includes('already has an associated') ? 409
        : message.includes('Cannot generate') ? 400
        : message.includes('Access denied') ? 403
        : 400;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    log.error('Error generating invoice from milestone:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice from milestone' },
      { status: 500 }
    );
  }
}
