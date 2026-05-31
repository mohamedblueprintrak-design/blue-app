import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';
import { validateIdParam } from '@/lib/api-validation';

// POST /api/projects/[id]/contractor-rfq/[bidId]/award
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
    // RBAC CHECK — awarding bids is a financial commitment
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId, bidId: rawBidId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const bidIdResult = validateIdParam(rawBidId);
    if (!bidIdResult.success) return bidIdResult.response;
    const bidId = bidIdResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, project);
    if (orgError) return orgError;

    const bid = await db.bid.findUnique({
      where: { id: bidId },
      include: { contractor: true },
    });

    if (!bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    // Verify bid belongs to this project
    if (bid.projectId !== id) {
      return NextResponse.json({ error: 'Bid does not belong to this project' }, { status: 400 });
    }

    // Update the bid
    await db.bid.update({
      where: { id: bidId },
      data: {
        isAwarded: true,
        rfqStatus: 'AWARDED',
        status: 'ACCEPTED',
      },
    });

    // Reject other bids for this project
    await db.bid.updateMany({
      where: {
        projectId: id,
        id: { not: bidId },
      },
      data: {
        isAwarded: false,
        rfqStatus: 'REJECTED',
        status: 'REJECTED',
      },
    });

    // Update project contractor
    if (bid.contractorId) {
      await db.project.update({
        where: { id },
        data: { contractorId: bid.contractorId },
      });
    }

    return NextResponse.json({ message: 'Bid awarded successfully', bid });
  } catch (error: unknown) {
    return handleApiError(error, 'ContractorRFQ Award');
  }
}
