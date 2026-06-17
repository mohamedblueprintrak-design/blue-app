import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateBody, companySettingsSchema } from '@/lib/api-validation';
import { Permission } from '@/lib/auth/types';
import { handleApiErrorWithLogging as handleApiError } from '@/lib/api-error';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import type { Currency } from '@/types/db-enums';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

export async function GET(request: NextRequest) {
  // Rate limiting
  const { result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  // RBAC CHECK (JWT-verified for settings)
  const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
  if ('error' in rbac) return rbac.error;

  try {
    const cacheKey = buildCacheKey('settings', 'company', rbac.user.organizationId || 'global');

    const settings = await cachedQuery(cacheKey, async () => {
      let settings = await db.companySettings.findFirst({
        where: { ...orgFilter(rbac.user) },
      });
      if (!settings) {
        settings = await db.companySettings.create({
          data: {
            name: 'مكتب الاستشارات الهندسية',
            nameEn: 'Engineering Consultancy Office',
            currency: 'AED' as Currency,
            timezone: 'Asia/Dubai',
            workingDays: 'sat,sun,mon,tue,wed,thu',
            workingHours: '08:00-17:00',
            ...orgCreate(rbac.user),
          },
        });
      }
      return settings;
    }, CACHE_TTL.SETTINGS);

    return NextResponse.json(settings);
  } catch (error: unknown) {
    return handleApiError(error, 'CompanySettings GET');
  }
}

export async function PUT(request: NextRequest) {
  // Rate limiting - strict for settings changes
  const { result: rlResult } = await withRateLimit(request, 'strict');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  // RBAC CHECK - requires SETTINGS_UPDATE permission (JWT-verified for settings)
  const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  try {
    const body = await validateBody(request, companySettingsSchema);
    if (body instanceof NextResponse) return body;
    const { currency, ...rest } = body;
    const existing = await db.companySettings.findFirst({
      where: { ...orgFilter(ctx) },
    });

    if (!existing) {
      const settings = await db.companySettings.create({ data: { ...rest, ...(currency ? { currency: currency as Currency } : {}), ...orgCreate(ctx) } });
      return NextResponse.json(settings);
    }

    const settings = await db.companySettings.update({
      where: { id: existing.id },
      data: { ...rest, ...(currency ? { currency: currency as Currency } : {}) },
    });

    // Invalidate settings cache after update
    await invalidateCache('settings');

    return NextResponse.json(settings);
  } catch (error: unknown) {
    return handleApiError(error, 'CompanySettings PUT');
  }
}
