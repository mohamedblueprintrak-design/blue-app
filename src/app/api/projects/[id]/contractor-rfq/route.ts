import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission, orgCheck, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateIdParam } from '@/lib/api-validation';

// POST /api/projects/[id]/contractor-rfq - Send RFQ to selected contractors
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK — sending RFQs requires contractor creation permission
    const rbac = await requireVerifiedPermission(request, Permission.CONTRACTOR_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const { contractorIds, deadline } = await request.json();

    if (!contractorIds || !Array.isArray(contractorIds) || contractorIds.length === 0) {
      return NextResponse.json({ error: 'contractorIds is required and must be a non-empty array' }, { status: 400 });
    }

    // Validate each contractorId is a string
    if (!contractorIds.every((cid: unknown) => typeof cid === 'string')) {
      return NextResponse.json({ error: 'All contractorIds must be strings' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, project);
    if (orgError) return orgError;

    // Create bids for each selected contractor
    const bids = await Promise.all(
      contractorIds.map(async (contractorId: string) => {
        const contractor = await db.contractor.findUnique({ where: { id: contractorId } });
        return db.bid.create({
          data: {
            projectId: id,
            contractorId,
            contractorName: contractor?.companyName || contractor?.name || '',
            contractorContact: contractor?.contactPerson || '',
            status: 'SUBMITTED',
            rfqStatus: 'SENT',
            rfqSentAt: new Date(),
            deadline: deadline ? new Date(deadline) : null,
            ...orgCreate(user),
          },
        });
      })
    );

    return NextResponse.json({ bids, message: 'RFQ sent successfully' }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, 'ContractorRFQ');
  }
}
