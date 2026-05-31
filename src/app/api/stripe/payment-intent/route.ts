/**
 * API Route: Stripe Payment Intent
 * مسار نية الدفع Stripe
 *
 * POST - Create payment intent for one-time payment
 * GET - Retrieve payment intent status
 */

import { NextRequest} from 'next/server';
import {
  createPaymentIntent,
  retrievePaymentIntent,
    isStripeConfigured,
} from '@/lib/stripe';
import { successResponse, errorResponse, forbiddenResponse } from '../../utils/response';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * POST - Create a payment intent
 */
export async function POST(request: NextRequest) {
  // Rate limiting - strict for payment operations
  const { result: rlResult } = await withRateLimit(request, 'strict');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  // RBAC CHECK - requires INVOICE_CREATE permission (JWT-verified for payments)
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  try {
    const body = await request.json();
    const { amount, currency = 'AED', customerId, description, metadata } = body;

    if (!amount || amount <= 0) {
      return errorResponse('المبلغ يجب أن يكون أكبر من صفر', 'INVALID_AMOUNT', 400);
    }

    // Validate amount limits (minimum 1 AED = 100 fils)
    if (amount < 1) {
      return errorResponse('الحد الأدنى للدفع هو 1 درهم', 'AMOUNT_TOO_SMALL', 400);
    }

    // Maximum amount (1,000,000 AED)
    if (amount > 1000000) {
      return errorResponse('الحد الأقصى للدفع هو 1,000,000 درهم', 'AMOUNT_TOO_LARGE', 400);
    }

    // SECURITY: Inject organizationId into metadata for future org verification
    const enrichedMetadata = {
      ...metadata,
      organizationId: ctx.organizationId || metadata?.organizationId,
    };

    const paymentIntent = await createPaymentIntent({
      amount,
      currency,
      customerId,
      description,
      metadata: enrichedMetadata,
    });

    if (!paymentIntent) {
      return errorResponse('فشل في إنشاء نية الدفع', 'PAYMENT_INTENT_ERROR', 500);
    }

    return successResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status: paymentIntent.status,
    });
  } catch (error) {
    log.error('Payment intent creation error:', error);
    return errorResponse(
      'حدث خطأ أثناء إنشاء نية الدفع',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * GET - Retrieve payment intent status
 */
export async function GET(request: NextRequest) {
  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  // RBAC CHECK - requires INVOICE_READ permission (JWT-verified for payments)
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return errorResponse('معرف نية الدفع مطلوب', 'MISSING_PAYMENT_INTENT_ID', 400);
    }

    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    if (!paymentIntent) {
      return errorResponse('نية الدفع غير موجودة', 'PAYMENT_INTENT_NOT_FOUND', 404);
    }

    // SECURITY: Verify payment intent belongs to user's org
    const piOrgId = paymentIntent.metadata?.organizationId as string | undefined;
    if (process.env.MULTI_TENANT === 'true' && ctx.organizationId && piOrgId && piOrgId !== ctx.organizationId) {
      return forbiddenResponse('Payment intent does not belong to your organization');
    }

    return successResponse({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      // NOTE: client_secret intentionally excluded — only returned on POST (creation)
      // to minimize attack surface on status-check endpoint
    });
  } catch (error) {
    log.error('Payment intent retrieval error:', error);
    return errorResponse(
      'حدث خطأ أثناء استرجاع نية الدفع',
      'INTERNAL_ERROR',
      500
    );
  }
}
