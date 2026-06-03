/**
 * Report Builder API — List & Create
 * API منشئ التقارير — القائمة والإنشاء
 *
 * GET  /api/reports/builder      — List saved report templates for the organization
 * POST /api/reports/builder      — Create a new report template
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { handleApiError, successResponse, createdResponse } from '@/app/api/utils/response';
import { createReportTemplateSchema } from '@/lib/validations/report-builder.schema';

// ============================================
// GET — List saved report templates
// ============================================

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const orgWhere = orgFilter(ctx);

    // Support query param filtering by dataSource
    const url = new URL(request.url);
    const dataSourceFilter = url.searchParams.get('dataSource');

    const where: Record<string, unknown> = { ...orgWhere };
    if (dataSourceFilter) {
      where.dataSource = dataSourceFilter;
    }

    const reports = await db.reportTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Parse JSON fields for response
    const parsed = reports.map((report) => ({
      ...report,
      fields: JSON.parse(report.fields),
      filters: JSON.parse(report.filters),
    }));

    return successResponse(parsed);
  } catch (error) {
    return handleApiError('Failed to list report templates', error);
  }
}

// ============================================
// POST — Create a new report template
// ============================================

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.REPORTS_EXPORT);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();
    const validation = validateRequest(createReportTemplateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Serialize JSON fields for storage
    const report = await db.reportTemplate.create({
      data: {
        name: data.name,
        nameAr: data.nameAr ?? null,
        description: data.description ?? null,
        dataSource: data.dataSource,
        fields: JSON.stringify(data.fields),
        filters: JSON.stringify(data.filters),
        groupBy: data.groupBy ?? null,
        sortBy: data.sortBy ?? null,
        sortOrder: data.sortOrder,
        chartType: data.chartType,
        isPublic: data.isPublic,
        createdById: ctx.userId,
        ...orgCreate(ctx),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    log.info('Report template created', {
      reportId: report.id,
      name: report.name,
      dataSource: report.dataSource,
      userId: ctx.userId,
    });

    return createdResponse({
      ...report,
      fields: JSON.parse(report.fields),
      filters: JSON.parse(report.filters),
    });
  } catch (error) {
    return handleApiError('Failed to create report template', error);
  }
}

// ============================================
// OPTIONS — CORS preflight
// ============================================

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return response;
}
