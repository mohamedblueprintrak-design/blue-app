import { NextRequest, NextResponse } from 'next/server';
import { generateExcelExport } from '@/lib/excel-generator';
import { log } from '@/lib/logger';
import { handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'export');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // AUTH CHECK — Excel exports contain sensitive data
    const rbac = await requireVerifiedPermission(request, Permission.REPORTS_EXPORT);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'projects';
    const lang = (searchParams.get('lang') as 'ar' | 'en') || 'ar';

    const validTypes = ['financial', 'projects', 'tasks', 'invoices', 'clients', 'contracts'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // SECURITY: Pass orgFilter to ensure multi-tenant isolation —
    // only data belonging to the user's organization is exported.
    const org = orgFilter(ctx);
    const buffer = await generateExcelExport(type, lang, org);

    const filename = `blueprint-${type}-export-${Date.now()}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    log.error('Error generating Excel export:', error);
    return handleApiError(error, 'ExcelExport');
  }
}
