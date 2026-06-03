/**
 * Report Builder API — List & Create
 * API منشئ التقارير — القائمة والإنشاء
 *
 * GET  /api/report-builder      — List saved report definitions for the organization
 * POST /api/report-builder      — Create a new report definition
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { handleApiError, successResponse, createdResponse } from '@/app/api/utils/response';

// ============================================
// Zod Schemas
// ============================================

const VALID_DATA_SOURCES = [
  'projects', 'invoices', 'tasks', 'clients', 'employees',
  'payments', 'contracts', 'timesheets', 'expenses', 'commissions',
] as const;

const VALID_AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max', 'none'] as const;

const VALID_OPERATORS = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'contains', 'startsWith', 'in', 'between',
] as const;

const VALID_CHART_TYPES = ['bar', 'line', 'pie', 'table'] as const;

const reportFieldSchema = z.object({
  key: z.string().min(1, 'Field key is required'),
  label: z.string().min(1, 'Field label is required'),
  aggregation: z.enum(VALID_AGGREGATIONS),
});

const reportFilterSchema = z.object({
  field: z.string().min(1, 'Filter field is required'),
  operator: z.enum(VALID_OPERATORS),
  value: z.unknown(),
  value2: z.unknown().optional(),
});

const createReportSchema = z.object({
  name: z.string().min(1, 'Report name is required').max(200),
  nameAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  dataSource: z.enum(VALID_DATA_SOURCES),
  fields: z.array(reportFieldSchema).min(1, 'At least one field is required'),
  filters: z.array(reportFilterSchema).default([]),
  groupBy: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  chartType: z.enum(VALID_CHART_TYPES).default('table'),
  isPublic: z.boolean().default(false),
});

// ============================================
// GET — List saved reports
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

    const reports = await db.reportTemplate.findMany({
      where: orgWhere,
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
// POST — Create a new report definition
// ============================================

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();
    const validation = validateRequest(createReportSchema, body);
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
