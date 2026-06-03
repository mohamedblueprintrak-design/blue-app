/**
 * Report Builder API — Export a report
 * API منشئ التقارير — تصدير تقرير
 *
 * POST /api/reports/builder/[id]/export — Export a saved report template as PDF, Excel, CSV, or JSON
 *
 * Requires REPORTS_EXPORT permission.
 *
 * Body:
 *   {
 *     format: 'pdf' | 'excel' | 'csv' | 'json',
 *     language?: 'ar' | 'en',
 *     title?: string,
 *     filters?: ReportFilter[]  // Override template filters for this export
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateIdParam, validateRequest } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { handleApiError, notFoundResponse } from '@/app/api/utils/response';
import {
  executeReport,
  formatAsCSV,
  formatAsPDF,
  formatAsExcel,
  validateReportDefinition,
  type ReportDefinition,
  type DataSourceName,
  type AggregationType,
  type FilterOperator,
} from '@/lib/services/report-builder.service';
import { exportReportSchema } from '@/lib/validations/report-builder.schema';

// ============================================
// POST — Export a report template
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    // Require REPORTS_EXPORT permission for export operations
    const result = await requireVerifiedPermission(request, Permission.REPORTS_EXPORT);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Load the report template
    const orgWhere = orgFilter(ctx);
    const template = await db.reportTemplate.findFirst({
      where: { id, ...orgWhere },
    });

    if (!template) {
      return notFoundResponse('Report template not found');
    }

    // Check org access
    const orgError = orgCheck(ctx, template);
    if (orgError) return orgError;

    // Validate export request body
    const body = await request.json();
    const validation = validateRequest(exportReportSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const { format, language, title, filters: overrideFilters } = validation.data;

    // Parse template's JSON fields
    const parsedFields: Array<{ key: string; label: string; aggregation: string }> = JSON.parse(template.fields);
    const parsedFilters: Array<{ field: string; operator: string; value: unknown; value2?: unknown }> =
      overrideFilters ?? JSON.parse(template.filters);

    // Build report definition from template
    const reportDefinition: ReportDefinition = {
      id: template.id,
      name: template.name,
      nameAr: template.nameAr ?? undefined,
      description: template.description ?? undefined,
      dataSource: template.dataSource as DataSourceName,
      fields: parsedFields.map((f) => ({
        key: f.key,
        label: f.label,
        aggregation: f.aggregation as AggregationType,
      })),
      filters: parsedFilters.map((f) => ({
        field: f.field,
        operator: f.operator as FilterOperator,
        value: f.value,
        value2: f.value2,
      })),
      groupBy: template.groupBy ?? undefined,
      sortBy: template.sortBy ?? undefined,
      sortOrder: (template.sortOrder as 'asc' | 'desc') || undefined,
      chartType: (template.chartType as 'bar' | 'line' | 'pie' | 'table') || undefined,
    };

    // Validate the report definition
    const validationErrors = validateReportDefinition(reportDefinition);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid report definition', details: validationErrors },
        { status: 400 }
      );
    }

    // Execute the report
    const reportResult = await executeReport(reportDefinition, ctx.organizationId);

    // Determine the report title
    const reportTitle = title || template.nameAr || template.name;
    const safeFilename = reportTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');

    log.info('Report exported', {
      reportId: id,
      format,
      language,
      dataSource: reportDefinition.dataSource,
      totalRows: reportResult.totalRows,
      executionTimeMs: reportResult.executionTimeMs,
      userId: ctx.userId,
    });

    // Return in the requested format
    switch (format) {
      case 'pdf': {
        const pdfBuffer = await formatAsPDF(reportResult, reportTitle, language);
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
          },
        });
      }

      case 'excel': {
        const excelBuffer = await formatAsExcel(reportResult, reportTitle, language);
        return new NextResponse(new Uint8Array(excelBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${safeFilename}.xlsx"`,
          },
        });
      }

      case 'csv': {
        const csv = formatAsCSV(reportResult);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeFilename}.csv"`,
          },
        });
      }

      case 'json':
      default: {
        return NextResponse.json({
          success: true,
          data: {
            template: {
              id: template.id,
              name: template.name,
              nameAr: template.nameAr,
              dataSource: template.dataSource,
            },
            result: reportResult,
          },
        });
      }
    }
  } catch (error) {
    return handleApiError('Failed to export report', error);
  }
}

// ============================================
// OPTIONS — CORS preflight
// ============================================

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return response;
}
