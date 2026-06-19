/**
 * API Route: Stripe Subscriptions Management
 * مسار إدارة الاشتراكات Stripe
 *
 * GET - Get subscription details
 * POST - Create subscription
 * PUT - Update subscription (upgrade/downgrade)
 * DELETE - Cancel subscription
 */

import { NextRequest} from 'next/server';
import {
  getSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  isStripeConfigured,
} from '@/lib/stripe';
import { getSubscriptionPeriod, getInvoiceFields } from '@/lib/stripe-types';
import { successResponse, errorResponse, forbiddenResponse } from '../../utils/response';
import { requireVerifiedPermission } from '../../utils/auth';
import { requireStepUp2FA, clearStepUpSession } from '@/lib/auth/step-up-2fa';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';

/**
 * Verify the Stripe customer belongs to the user's organization.
 * In multi-tenant mode, users must only access their own org's Stripe data.
 */
function verifyStripeOrgAccess(
  userOrgId: string | null,
  metadataOrgId?: string | null
): boolean {
  if (process.env.MULTI_TENANT !== 'true') return true; // Single-tenant: no check needed
  if (!userOrgId) return false; // Multi-tenant user without org — deny
  if (!metadataOrgId) return false; // Reject if metadataOrgId is missing in multi-tenant mode to prevent IDOR
  return userOrgId === metadataOrgId;
}

/**
 * GET - Retrieve subscription details
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
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return errorResponse('معرف الاشتراك مطلوب', 'MISSING_SUBSCRIPTION_ID', 400);
    }

    const subscription = await getSubscription(subscriptionId);

    if (!subscription) {
      return errorResponse('الاشتراك غير موجود', 'SUBSCRIPTION_NOT_FOUND', 404);
    }

    // SECURITY: Verify subscription belongs to user's org
    const subOrgId = subscription.metadata?.organizationId as string | undefined;
    if (!verifyStripeOrgAccess(ctx.organizationId, subOrgId)) {
      return forbiddenResponse('Subscription does not belong to your organization');
    }

    const period = getSubscriptionPeriod(subscription);

    return successResponse({
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(period.current_period_start * 1000),
      currentPeriodEnd: new Date(period.current_period_end * 1000),
      cancelAtPeriodEnd: period.cancel_at_period_end,
      canceledAt: period.canceled_at ? new Date(period.canceled_at * 1000) : null,
      plan: {
        id: subscription.items.data[0]?.price?.id,
        amount: subscription.items.data[0]?.price?.unit_amount,
        currency: subscription.items.data[0]?.price?.currency,
        interval: subscription.items.data[0]?.price?.recurring?.interval,
      },
    });
  } catch (error) {
    log.error('Get subscription error:', error);
    return errorResponse(
      'حدث خطأ أثناء استرجاع الاشتراك',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * POST - Create a new subscription
 */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  // RBAC CHECK - requires INVOICE_CREATE permission (JWT-verified for payments)
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  try {
    const body = await request.json();
    const { customerId, priceId, trialPeriodDays, metadata } = body;

    if (!customerId || !priceId) {
      return errorResponse('معرف العميل ومعرف السعر مطلوبان', 'MISSING_FIELDS', 400);
    }

    // SECURITY: Inject organizationId into metadata for future org verification
    const enrichedMetadata = {
      ...metadata,
      organizationId: ctx.organizationId || metadata?.organizationId,
    };

    const subscription = await createSubscription({
      customerId,
      priceId,
      trialPeriodDays,
      metadata: enrichedMetadata,
    });

    if (!subscription) {
      return errorResponse('فشل في إنشاء الاشتراك', 'SUBSCRIPTION_CREATE_ERROR', 500);
    }

    const _period = getSubscriptionPeriod(subscription);

    return successResponse({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: (() => {
          if (!subscription.latest_invoice || typeof subscription.latest_invoice !== 'object') return null;
          const invoiceFields = getInvoiceFields(subscription.latest_invoice);
          const pi = invoiceFields.payment_intent;
          return typeof pi === 'object' && pi !== null ? (pi as Record<string, unknown>).client_secret as string | null | undefined : null;
        })(),
      message: trialPeriodDays
        ? `تم إنشاء الاشتراك مع فترة تجريبية ${trialPeriodDays} يوم`
        : 'تم إنشاء الاشتراك بنجاح',
    });
  } catch (error) {
    log.error('Create subscription error:', error);
    return errorResponse(
      'حدث خطأ أثناء إنشاء الاشتراك',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * PUT - Update subscription (upgrade/downgrade)
 *
 * SECURITY: Step-up 2FA required — modifying billing is a sensitive operation.
 */
export async function PUT(request: NextRequest) {
  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  // RBAC CHECK - requires INVOICE_UPDATE permission (JWT-verified for payments)
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_UPDATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  // Step-up 2FA — required for billing changes (upgrade/downgrade)
  const stepUpResult = await requireStepUp2FA(request, ctx);
  if ('error' in stepUpResult) return stepUpResult.error;

  try {
    const body = await request.json();
    const { subscriptionId, newPriceId, prorationBehavior, action, metadata } = body;

    if (!subscriptionId) {
      return errorResponse('معرف الاشتراك مطلوب', 'MISSING_SUBSCRIPTION_ID', 400);
    }

    // SECURITY: Verify subscription belongs to user's org before modifying
    const existingSub = await getSubscription(subscriptionId);
    if (existingSub) {
      const subOrgId = existingSub.metadata?.organizationId as string | undefined;
      if (!verifyStripeOrgAccess(ctx.organizationId, subOrgId)) {
        return forbiddenResponse('Subscription does not belong to your organization');
      }
    }

    // Handle reactivation
    if (action === 'reactivate') {
      const subscription = await reactivateSubscription(subscriptionId);

      if (!subscription) {
        return errorResponse('فشل في إعادة تفعيل الاشتراك', 'REACTIVATE_ERROR', 500);
      }

      return successResponse({
        message: 'تم إعادة تفعيل الاشتراك بنجاح',
        status: subscription.status,
      });
    }

    // Handle upgrade/downgrade
    if (!newPriceId) {
      return errorResponse('معرف السعر الجديد مطلوب', 'MISSING_NEW_PRICE_ID', 400);
    }

    const subscription = await updateSubscription(subscriptionId, {
      newPriceId,
      prorationBehavior: prorationBehavior || 'create_prorations',
      metadata: {
        ...metadata,
        organizationId: ctx.organizationId || metadata?.organizationId,
      },
    });

    if (!subscription) {
      return errorResponse('فشل في تحديث الاشتراك', 'SUBSCRIPTION_UPDATE_ERROR', 500);
    }

    return successResponse({
      message: 'تم تحديث الاشتراك بنجاح',
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error) {
    log.error('Update subscription error:', error);
    return errorResponse(
      'حدث خطأ أثناء تحديث الاشتراك',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * DELETE - Cancel subscription
 *
 * SECURITY: Step-up 2FA required — cancelling billing is a sensitive operation.
 */
export async function DELETE(request: NextRequest) {
  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  // RBAC CHECK - requires INVOICE_DELETE permission (JWT-verified for payments)
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_DELETE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  // Step-up 2FA — required for subscription cancellation
  const stepUpResult = await requireStepUp2FA(request, ctx);
  if ('error' in stepUpResult) return stepUpResult.error;

  try {
    // NOTE: DELETE requests with body may be stripped by proxies (e.g., Cloudflare, nginx).
    // Accept subscriptionId and immediately from query parameters as fallback.
    const { searchParams } = new URL(request.url);
    let subscriptionId: string | undefined;
    let immediately = false;

    try {
      const body = await request.json();
      subscriptionId = body.subscriptionId;
      immediately = body.immediately ?? false;
    } catch {
      // Body read failed (empty body or stripped by proxy) — fall back to query params
      subscriptionId = searchParams.get('subscriptionId') || undefined;
      immediately = searchParams.get('immediately') === 'true';
    }

    if (!subscriptionId) {
      return errorResponse('معرف الاشتراك مطلوب', 'MISSING_SUBSCRIPTION_ID', 400);
    }

    // SECURITY: Verify subscription belongs to user's org before canceling
    const existingSub = await getSubscription(subscriptionId);
    if (existingSub) {
      const subOrgId = existingSub.metadata?.organizationId as string | undefined;
      if (!verifyStripeOrgAccess(ctx.organizationId, subOrgId)) {
        return forbiddenResponse('Subscription does not belong to your organization');
      }
    }

    const subscription = await cancelSubscription(subscriptionId, !immediately);

    if (!subscription) {
      return errorResponse('فشل في إلغاء الاشتراك', 'CANCEL_ERROR', 500);
    }

    // Clear step-up session (one-shot — can't reuse after cancellation)
    clearStepUpSession(ctx.userId);

    return successResponse({
      message: immediately
        ? 'تم إلغاء الاشتراك فوراً'
        : 'سيتم إلغاء الاشتراك في نهاية الفترة الحالية',
      status: subscription.status,
      cancelAtPeriodEnd: !immediately,
    });
  } catch (error) {
    log.error('Cancel subscription error:', error);
    return errorResponse(
      'حدث خطأ أثناء إلغاء الاشتراك',
      'INTERNAL_ERROR',
      500
    );
  }
}
