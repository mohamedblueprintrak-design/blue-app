/**
 * Report Builder API — Execute
 * API منشئ التقارير — تنفيذ
 *
 * POST /api/report-builder/execute — Execute a report (by saved ID or inline definition)
 *
 * Accepts either:
 *   { reportId: string }              — Execute a saved report template
 *   { definition: ReportDefinition }  — Execute an inline report definition
 *
 * Returns results in the requested format (json, csv, pdf).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { handleApiError } from '@/app/api/utils/response';
import {
  executeReport,
  formatAsCSV,
  formatAsPDF,
  validateReportDefinition,
  type ReportDefinition,
  type DataSourceName,
  type AggregationType,
  type FilterOperator,
  type OutputFormat,
} from '@/lib/services/report-builder.service';

// ============================================
// Zod Schemas
// ============================================

const VALID_DATA_SOURCES: [string, ...string[]] = [
  'projects', 'invoices', 'tasks', 'clients', 'employees',
  'payments', 'contracts', 'timesheets', 'expenses', 'commissions',
];

const VALID_AGGREGATIONS: [string, ...string[]] = ['sum', 'avg', 'count', 'min', 'max', 'none'];

const VALID_OPERATORS: [string, ...string[]] = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'contains', 'startsWith', 'in', 'between',
];

const VALID_CHART_TYPES: [string, ...string[]] = ['bar', 'line', 'pie', 'table'];

const VALID_FORMATS: [string, ...string[]] = ['json', 'csv', 'pdf'];

const reportFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  aggregation: z.enum(VALID_AGGREGATIONS),
});

const reportFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(VALID_OPERATORS),
  value: z.unknown(),
  value2: z.unknown().optional(),
});

const inlineDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  dataSource: z.enum(VALID_DATA_SOURCES),
  fields: z.array(reportFieldSchema).min(1),
  filters: z.array(reportFilterSchema).default([]),
  groupBy: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  chartType: z.enum(VALID_CHART_TYPES).default('table'),
  format: z.enum(VALID_FORMATS).default('json'),
});

const executeReportSchema = z.object({
  reportId: z.string().optional(),
  definition: inlineDefinitionSchema.optional(),
}).refine(
  (data) => data.reportId || data.definition,
  { message: 'Either reportId or definition must be provided' }
);

// ============================================
// POST — Execute a report
// ============================================

export async function POST(request: NextRequest) {
  // Rate limit using 'api' tier (as specified)
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();
    const validation = executeReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { reportId, definition: inlineDef } = validation.data;

    let reportDefinition: ReportDefinition;
    let outputFormat: OutputFormat = 'json';
    let reportName: string;

    if (reportId) {
      // Load saved report template
      const orgWhere = orgFilter(ctx);
      const template = await db.reportTemplate.findFirst({
        where: { id: reportId, ...orgWhere },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Report template not found' },
          { status: 404 }
        );
      }

      const parsedFields: Array<{ key: string; label: string; aggregation: string }> = JSON.parse(template.fields);
      const parsedFilters: Array<{ field: string; operator: string; value: unknown; value2?: unknown }> = JSON.parse(template.filters);

      reportDefinition = {
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

      outputFormat = (inlineDef?.format as OutputFormat) || 'json';
      reportName = template.name;
    } else if (inlineDef) {
      reportDefinition = {
        name: inlineDef.name,
        nameAr: inlineDef.nameAr,
        description: inlineDef.description,
        dataSource: inlineDef.dataSource as DataSourceName,
        fields: inlineDef.fields.map((f) => ({
          key: f.key,
          label: f.label,
          aggregation: f.aggregation as AggregationType,
        })),
        filters: inlineDef.filters.map((f) => ({
          field: f.field,
          operator: f.operator as FilterOperator,
          value: f.value,
          value2: f.value2,
        })),
        groupBy: inlineDef.groupBy,
        sortBy: inlineDef.sortBy,
        sortOrder: inlineDef.sortOrder as 'asc' | 'desc',
        chartType: inlineDef.chartType as 'bar' | 'line' | 'pie' | 'table',
      };
      outputFormat = (inlineDef.format as OutputFormat) || 'json';
      reportName = inlineDef.name;
    } else {
      return NextResponse.json(
        { error: 'Either reportId or definition must be provided' },
        { status: 400 }
      );
    }

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
      reportId: reportId ?? 'inline',
      dataSource: reportDefinition.dataSource,
      format: outputFormat,
      totalRows: reportResult.totalRows,
      executionTimeMs: reportResult.executionTimeMs,
      userId: ctx.userId,
    });

    // Return in the requested format
    switch (outputFormat) {
      case 'csv': {
        const csv = formatAsCSV(reportResult);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${reportName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.csv"`,
          },
        });
      }

      case 'pdf': {
        const pdfBuffer = await formatAsPDF(
          reportResult,
          reportName,
          ctx.organizationId ? 'ar' : 'en'
        );
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${reportName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.pdf"`,
          },
        });
      }

      case 'json':
      default:
        return NextResponse.json({
          success: true,
          data: {
            definition: reportDefinition,
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
