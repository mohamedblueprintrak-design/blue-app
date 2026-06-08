import { NextRequest, NextResponse } from 'next/server';
import { generateSiteReportPDFBuffer } from '@/lib/pdf/site-report-pdf';
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

    // AUTH CHECK — site reports contain project data
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Verify site diary belongs to user's organization before generating PDF
    const siteDiary = await db.siteDiary.findUnique({ where: { id }, select: { organizationId: true } });
    const orgError = orgCheck(ctx, siteDiary);
    if (orgError) return orgError;

    const { searchParams } = new URL(request.url);
    const lang = (searchParams.get('lang') as 'ar' | 'en') || 'en';

    const pdfBuffer = await generateSiteReportPDFBuffer(id, lang);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="site-diary-${id}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    log.error('Error generating site report PDF:', error);
    return handleApiError(error, 'SiteReportPDF');
  }
}
