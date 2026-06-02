import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { requirePermission } from '@/app/api/utils/auth';
import { errorResponse, successResponse, handleApiError } from '@/app/api/utils/response';
import { Permission } from '@/lib/auth/types';
import { DEFAULT_EXCHANGE_RATES, SUPPORTED_CURRENCIES } from '@/lib/currency';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

/**
 * GET /api/settings/currency
 * Get current currency settings and exchange rates
 */
export async function GET(request: NextRequest) {
  try {
    const rbac = requirePermission(request, Permission.SETTINGS_READ);
    if ('error' in rbac) return rbac.error;

    const cacheKey = buildCacheKey('settings', 'currency', 'global');

    const result = await cachedQuery(cacheKey, async () => {
      const settings = await db.companySettings.findFirst();

      let exchangeRates = DEFAULT_EXCHANGE_RATES;
      if (settings?.exchangeRates) {
        try {
          exchangeRates = { ...DEFAULT_EXCHANGE_RATES, ...JSON.parse(settings.exchangeRates) };
        } catch { /* use defaults */ }
      }

      return {
        defaultCurrency: settings?.defaultCurrency || settings?.currency || 'AED',
        currency: settings?.currency || 'AED',
        exchangeRates,
        supportedCurrencies: SUPPORTED_CURRENCIES,
      };
    }, CACHE_TTL.CURRENCY);

    return successResponse(result);
  } catch (error) {
    return handleApiError('Error fetching currency settings', error);
  }
}

/**
 * PUT /api/settings/currency
 * Update default currency and exchange rates
 * Requires SETTINGS_UPDATE permission
 */
export async function PUT(request: NextRequest) {
  try {
    const rbac = requirePermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;

    const body = await request.json();
    const { defaultCurrency, exchangeRates } = body;

    const settings = await db.companySettings.findFirst();
    if (!settings) {
      return errorResponse('Company settings not found', 'NOT_FOUND', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (defaultCurrency) {
      if (!SUPPORTED_CURRENCIES[defaultCurrency]) {
        return errorResponse(`Unsupported currency: ${defaultCurrency}`, 'VALIDATION_ERROR', 400);
      }
      updateData.defaultCurrency = defaultCurrency;
      updateData.currency = defaultCurrency;
    }
    if (exchangeRates) {
      updateData.exchangeRates = JSON.stringify(exchangeRates);
    }

    const updated = await db.companySettings.update({
      where: { id: settings.id },
      data: updateData,
    });

    // Invalidate settings and currency caches after update
    await invalidateCache('settings');

    return successResponse({
      defaultCurrency: updated.defaultCurrency || updated.currency,
      currency: updated.currency,
      exchangeRates: updated.exchangeRates ? JSON.parse(updated.exchangeRates) : DEFAULT_EXCHANGE_RATES,
    });
  } catch (error) {
    return handleApiError('Error updating currency settings', error);
  }
}
