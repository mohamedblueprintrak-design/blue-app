/**
 * Dashboard Default Preset API Route
 * مسار القالب الافتراضي للوحة المعلومات
 *
 * GET /api/dashboard/presets/default — Get default preset for the current user's role
 *
 * Returns the default dashboard preset for the authenticated user's role.
 * If no default exists in the database, one is auto-created from static config.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { getDefaultPreset } from '@/lib/services/dashboard-preset.service';

export async function GET(request: NextRequest) {
  try {
    // Allow any authenticated user to read their own default preset
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const preset = await getDefaultPreset(ctx.role, ctx.organizationId);

    if (!preset) {
      return NextResponse.json(
        { success: false, error: 'لا يوجد قالب افتراضي لهذا الدور' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        role: ctx.role,
        preset,
      },
    });
  } catch (error) {
    log.error('Error fetching default dashboard preset:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب القالب الافتراضي' },
      { status: 500 }
    );
  }
}
