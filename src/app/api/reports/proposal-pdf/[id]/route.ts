import { NextRequest, NextResponse } from 'next/server';
import { generateProposalPDFBuffer } from '@/lib/pdf/proposal-pdf';
import { log } from '@/lib/logger';
import { handleApiErrorWithLogging as handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateIdParam } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { allowed: _allowed, result } = await withRateLimit(request, 'export');
    const blocked = rateLimitResponse(result);
    if (blocked) return blocked;

    // AUTH CHECK — proposals contain financial data
    const rbac = await requireVerifiedPermission(request, Permission.PROPOSAL_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Verify proposal belongs to user's organization before generating PDF
    const proposal = await db.proposal.findUnique({ where: { id }, select: { organizationId: true } });
    const orgError = orgCheck(ctx, proposal);
    if (orgError) return orgError;

    const { searchParams } = new URL(request.url);
    const lang = (searchParams.get('lang') as 'ar' | 'en') || 'ar';

    const pdfBuffer = await generateProposalPDFBuffer(id, lang);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="proposal-${id}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    log.error('Error generating proposal PDF:', error);
    return handleApiError(error, 'ProposalPDF');
  }
}
