import { NextRequest } from 'next/server';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { errorResponse, successResponse, handleApiError } from '@/app/api/utils/response';
import { Permission } from '@/lib/auth/types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '@/lib/currency';
import { db } from '@/lib/db';

/**
 * POST /api/settings/currency/convert
 * Convert an amount between currencies
 * 
 * Body: { amount, from, to, rates? }
 */
export async function POST(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
    if ('error' in rbac) return rbac.error;

    const body = await request.json();
    const { amount, from, to } = body;

    if (typeof amount !== 'number' || !from || !to) {
      return errorResponse('amount, from, and to are required', 'VALIDATION_ERROR', 400);
    }

    // Get exchange rates from settings if not provided
    let rates = body.rates;
    if (!rates) {
      rates = DEFAULT_EXCHANGE_RATES;
    }

    const converted = convertCurrency(amount, from, to, rates);

    return successResponse({
      original: { amount, currency: from },
      converted: { amount: Math.round(converted * 100) / 100, currency: to },
      rate: rates[to] / rates[from],
    });
  } catch (error) {
    return handleApiError('Error converting currency', error);
  }
}
