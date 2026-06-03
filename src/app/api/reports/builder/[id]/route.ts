/**
 * Report Builder API — Get / Update / Delete
 * API منشئ التقارير — عرض / تحديث / حذف
 *
 * GET    /api/reports/builder/[id]  — Get a specific report template
 * PUT    /api/reports/builder/[id]  — Update a report template
 * DELETE /api/reports/builder/[id]  — Delete a report template
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { handleApiError, successResponse, notFoundResponse } from '@/app/api/utils/response';
import { updateReportTemplateSchema } from '@/lib/validations/report-builder.schema';

// ============================================
// GET — Get a specific report template
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const report = await db.reportTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!report) return notFoundResponse('Report template not found');

    // Check org access
    const orgError = orgCheck(ctx, report);
    if (orgError) return orgError;

    return successResponse({
      ...report,
      fields: JSON.parse(report.fields),
      filters: JSON.parse(report.filters),
    });
  } catch (error) {
    return handleApiError('Failed to get report template', error);
  }
}

// ============================================
// PUT — Update a report template
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.REPORTS_EXPORT);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const existing = await db.reportTemplate.findUnique({ where: { id } });
    if (!existing) return notFoundResponse('Report template not found');

    const orgError = orgCheck(ctx, existing);
    if (orgError) return orgError;

    const body = await request.json();
    const validation = validateRequest(updateReportTemplateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Build update payload — only include provided fields
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dataSource !== undefined) updateData.dataSource = data.dataSource;
    if (data.fields !== undefined) updateData.fields = JSON.stringify(data.fields);
    if (data.filters !== undefined) updateData.filters = JSON.stringify(data.filters);
    if (data.groupBy !== undefined) updateData.groupBy = data.groupBy;
    if (data.sortBy !== undefined) updateData.sortBy = data.sortBy;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.chartType !== undefined) updateData.chartType = data.chartType;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    const updated = await db.reportTemplate.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    log.info('Report template updated', {
      reportId: id,
      userId: ctx.userId,
    });

    return successResponse({
      ...updated,
      fields: JSON.parse(updated.fields),
      filters: JSON.parse(updated.filters),
    });
  } catch (error) {
    return handleApiError('Failed to update report template', error);
  }
}

// ============================================
// DELETE — Delete a report template
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.REPORTS_EXPORT);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const existing = await db.reportTemplate.findUnique({ where: { id } });
    if (!existing) return notFoundResponse('Report template not found');

    const orgError = orgCheck(ctx, existing);
    if (orgError) return orgError;

    await db.reportTemplate.delete({ where: { id } });

    log.info('Report template deleted', {
      reportId: id,
      userId: ctx.userId,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError('Failed to delete report template', error);
  }
}

// ============================================
// OPTIONS — CORS preflight
// ============================================

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return response;
}
