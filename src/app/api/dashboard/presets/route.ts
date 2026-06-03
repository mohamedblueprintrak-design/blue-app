/**
 * Dashboard Presets API Route
 * مسار قوالب لوحة المعلومات
 *
 * GET  /api/dashboard/presets — List presets by role (query: ?role=ADMIN)
 * POST /api/dashboard/presets — Create a custom preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { validateRequest } from '@/lib/api-validation';
import {
  getPresetsByRole,
  createPreset,
  initializeDefaultPresets,
  getAvailableRoles,
} from '@/lib/services/dashboard-preset.service';
import { z } from 'zod';

// ============================================
// Zod Schemas
// ============================================

const widgetSchema = z.object({
  id: z.string(),
  type: z.enum(['chart', 'stats', 'list', 'calendar', 'progress', 'alert']),
  title: z.string(),
  titleEn: z.string(),
  dataSource: z.string(),
  position: z.number().int().min(0),
  size: z.enum(['small', 'medium', 'large', 'full']),
  chartType: z.enum(['bar', 'line', 'pie', 'donut', 'area']).optional(),
  refreshInterval: z.number().int().min(0).optional(),
});

const createPresetSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  nameEn: z.string().min(1, 'الاسم بالإنجليزية مطلوب'),
  role: z.string().min(1, 'الدور مطلوب').refine(
    (val) => getAvailableRoles().some((r) => r.toUpperCase() === val.toUpperCase()),
    { message: 'قالب غير موجود لهذا الدور' }
  ),
  isDefault: z.boolean().optional().default(false),
  layout: z.string().optional(),
  widgets: z.array(widgetSchema).min(1, 'يجب أن يحتوي القالب على عنصر واحد على الأقل'),
});

// ============================================
// GET — List available dashboard presets by role
// ============================================

export async function GET(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || ctx.role;
    const init = searchParams.get('init') === 'true';

    // Optionally initialize default presets for the org
    if (init) {
      await initializeDefaultPresets(ctx.organizationId);
    }

    const presets = await getPresetsByRole(role, ctx.organizationId);

    return NextResponse.json({
      success: true,
      data: {
        role,
        presets,
      },
    });
  } catch (error) {
    log.error('Error fetching dashboard presets:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب قوالب لوحة المعلومات' },
      { status: 500 }
    );
  }
}

// ============================================
// POST — Create a custom dashboard preset
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { result: rlResult } = await withRateLimit(request, 'api');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    // RBAC CHECK — require SETTINGS_UPDATE to create presets
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'جسم الطلب غير صالح' },
        { status: 400 }
      );
    }

    const validation = validateRequest(createPresetSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const { name, nameEn, role, isDefault, layout, widgets } = validation.data;

    const preset = await createPreset({
      name,
      nameEn,
      role,
      isDefault,
      layout: layout ?? JSON.stringify(widgets.map((w, i) => ({ widgetId: w.id, order: i }))),
      widgets: JSON.stringify(widgets),
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `تم إنشاء قالب ${nameEn} بنجاح`,
        preset,
      },
    });
  } catch (error) {
    log.error('Error creating dashboard preset:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في إنشاء قالب لوحة المعلومات' },
      { status: 500 }
    );
  }
}
