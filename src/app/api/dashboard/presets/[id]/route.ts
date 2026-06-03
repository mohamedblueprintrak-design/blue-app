/**
 * Dashboard Preset Detail API Route
 * مسار تفاصيل قالب لوحة المعلومات
 *
 * GET    /api/dashboard/presets/[id] — Get a specific preset
 * PUT    /api/dashboard/presets/[id] — Update a preset
 * DELETE /api/dashboard/presets/[id] — Delete a preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { validateRequest } from '@/lib/api-validation';
import { getPresetById, updatePreset, deletePreset } from '@/lib/services/dashboard-preset.service';
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

const updatePresetSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  layout: z.string().optional(),
  widgets: z.array(widgetSchema).min(1).optional(),
});

// ============================================
// GET — Get a specific preset by ID
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;
    const preset = await getPresetById(id);

    if (!preset) {
      return NextResponse.json(
        { success: false, error: 'القالب غير موجود' },
        { status: 404 }
      );
    }

    // Org check
    const orgError = orgCheck(ctx, preset);
    if (orgError) return orgError;

    return NextResponse.json({
      success: true,
      data: { preset },
    });
  } catch (error) {
    log.error('Error fetching dashboard preset:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب القالب' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT — Update a preset
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const { result: rlResult } = await withRateLimit(request, 'api');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    // Check preset exists and belongs to org
    const existing = await getPresetById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'القالب غير موجود' },
        { status: 404 }
      );
    }

    const orgError = orgCheck(ctx, existing);
    if (orgError) return orgError;

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'جسم الطلب غير صالح' },
        { status: 400 }
      );
    }

    const validation = validateRequest(updatePresetSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.nameEn !== undefined) updateData.nameEn = validation.data.nameEn;
    if (validation.data.isDefault !== undefined) updateData.isDefault = validation.data.isDefault;
    if (validation.data.layout !== undefined) updateData.layout = validation.data.layout;
    if (validation.data.widgets !== undefined) {
      updateData.widgets = JSON.stringify(validation.data.widgets);
    }

    const preset = await updatePreset(id, updateData);

    return NextResponse.json({
      success: true,
      data: {
        message: 'تم تحديث القالب بنجاح',
        preset,
      },
    });
  } catch (error) {
    log.error('Error updating dashboard preset:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في تحديث القالب' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE — Delete a preset
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const { result: rlResult } = await withRateLimit(request, 'api');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    // Check preset exists and belongs to org
    const existing = await getPresetById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'القالب غير موجود' },
        { status: 404 }
      );
    }

    const orgError = orgCheck(ctx, existing);
    if (orgError) return orgError;

    // Prevent deleting the default preset
    if (existing.isDefault) {
      return NextResponse.json(
        { success: false, error: 'لا يمكن حذف القالب الافتراضي' },
        { status: 400 }
      );
    }

    await deletePreset(id);

    return NextResponse.json({
      success: true,
      data: {
        message: 'تم حذف القالب بنجاح',
      },
    });
  } catch (error) {
    log.error('Error deleting dashboard preset:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في حذف القالب' },
      { status: 500 }
    );
  }
}
