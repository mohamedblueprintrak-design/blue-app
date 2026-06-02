/**
 * Report Builder API — Data Sources
 * API منشئ التقارير — مصادر البيانات
 *
 * GET /api/report-builder/datasources — List available data sources and their fields
 *
 * Returns metadata about each data source including available fields,
 * their types, labels (bilingual), and available filter operators.
 * Used by the frontend to populate the report builder UI.
 */

import { NextRequest } from 'next/server';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { handleApiError, successResponse } from '@/app/api/utils/response';
import {
  getDataSourceMetadata,
  getFilterOperators,
} from '@/lib/services/report-builder.service';

// ============================================
// GET — List data sources metadata
// ============================================

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: _rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(_rlResult);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ('error' in result) return result.error;

    const dataSources = getDataSourceMetadata();
    const filterOperators = getFilterOperators();

    return successResponse({
      dataSources,
      filterOperators,
    });
  } catch (error) {
    return handleApiError('Failed to get data source metadata', error);
  }
}

// ============================================
// OPTIONS — CORS preflight
// ============================================

export async function OPTIONS() {
  const response = new Response(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return response;
}
