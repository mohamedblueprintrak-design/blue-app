/**
 * Report Builder API — Execute a saved report template
 * API منشئ التقارير — تنفيذ قالب تقرير محفوظ
 *
 * POST /api/reports/builder/[id]/execute — Execute a saved report template by ID
 *
 * Accepts optional body:
 *   { format?: 'json' | 'csv' | 'pdf', filters?: ReportFilter[] }
 *
 * The filters in the body can override the template's saved filters for ad-hoc execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateIdParam } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { handleApiError, notFoundResponse } from '@/app/api/utils/response';
import {
  executeReport,
  formatAsCSV,
  formatAsPDF,
  validateReportDefinition,
  type ReportDefinition,
  type DataSourceName,
  type AggregationType,
  type FilterOperator,
} from '@/lib/services/report-builder.service';
import { reportFilterSchema, VALID_EXPORT_FORMATS } from '@/lib/validations/report-builder.schema';

// ============================================
// Zod Schema for execute request body
// ============================================

const executeBodySchema = z.object({
  format: z.enum(VALID_EXPORT_FORMATS).default('json').optional(),
  filters: z.array(reportFilterSchema).optional(), // Override template filters
});

// ============================================
// POST — Execute a saved report template
// ============================================

export async function POST(
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

    // Parse optional body for format and filter overrides
    let bodyFormat: string = 'json';
    let overrideFilters: Array<{ field: string; operator: string; value: unknown; value2?: unknown }> | undefined;

    try {
      const body = await request.json();
      const parsed = executeBodySchema.safeParse(body);
      if (parsed.success) {
        bodyFormat = parsed.data.format ?? 'json';
        overrideFilters = parsed.data.filters as Array<{ field: string; operator: string; value: unknown; value2?: unknown }> | undefined;
      }
    } catch {
      // No body or invalid body — use defaults
    }

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

    log.info('Report executed', {
      reportId: id,
      dataSource: reportDefinition.dataSource,
      format: bodyFormat,
      totalRows: reportResult.totalRows,
      executionTimeMs: reportResult.executionTimeMs,
      userId: ctx.userId,
    });

    // Return in the requested format
    switch (bodyFormat) {
      case 'csv': {
        const csv = formatAsCSV(reportResult);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${template.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.csv"`,
          },
        });
      }

      case 'pdf': {
        const pdfBuffer = await formatAsPDF(
          reportResult,
          template.nameAr || template.name,
          ctx.organizationId ? 'ar' : 'en'
        );
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${template.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.pdf"`,
          },
        });
      }

      case 'json':
      default:
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
  } catch (error) {
    return handleApiError('Failed to execute report', error);
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
