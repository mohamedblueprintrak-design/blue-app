import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateBody, companySettingsSchema } from '@/lib/api-validation';
import { Permission } from '@/lib/auth/types';
import { handleApiError } from '@/lib/api-error';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { Currency } from '@prisma/client';

export async function GET(request: NextRequest) {
  // Rate limiting
  const { result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  // RBAC CHECK (JWT-verified for settings)
  const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
  if ('error' in rbac) return rbac.error;

  try {
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

    return NextResponse.json(settings);
  } catch (error: unknown) {
    return handleApiError(error, 'CompanySettings PUT');
  }
}
