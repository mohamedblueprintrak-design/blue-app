/**
 * API Route: Stripe Payment Methods
 * مسار طرق الدفع Stripe
 *
 * GET - List customer's payment methods
 * POST - Attach payment method to customer
 * DELETE - Detach payment method
 */

import { NextRequest} from 'next/server';
import {
  listPaymentMethods,
  attachPaymentMethod,
  detachPaymentMethod,
  setDefaultPaymentMethod,
  isStripeConfigured,
} from '@/lib/stripe';
import { successResponse, errorResponse, forbiddenResponse } from '../../utils/response';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { db } from '@/lib/db';

/**
 * GET - List payment methods for a customer
 */
export async function GET(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.PAYMENT_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const type = (searchParams.get('type') as 'card') || 'card';

    if (!customerId) {
      return errorResponse('معرف العميل مطلوب', 'MISSING_CUSTOMER_ID', 400);
    }

    // SECURITY: In multi-tenant mode, verify the Stripe customer belongs to user's org
    if (process.env.MULTI_TENANT === 'true' && ctx.organizationId) {
      const org = await db.organization.findFirst({
        where: { id: ctx.organizationId, stripeCustomerId: customerId },
        select: { id: true },
      });
      if (!org) {
        return forbiddenResponse('Customer does not belong to your organization');
      }
    }

    const methods = await listPaymentMethods(customerId, type);

    if (!methods) {
      return errorResponse('فشل في استرجاع طرق الدفع', 'PAYMENT_METHODS_ERROR', 500);
    }

    return successResponse({
      paymentMethods: methods.map(method => ({
        id: method.id,
        type: method.type,
        card: method.card ? {
          brand: method.card.brand,
          last4: method.card.last4,
          expMonth: method.card.exp_month,
          expYear: method.card.exp_year,
        } : null,
        isDefault: false, // Will be determined by customer's invoice_settings
      })),
    });
  } catch (error) {
    log.error('List payment methods error:', error);
    return errorResponse(
      'حدث خطأ أثناء استرجاع طرق الدفع',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * POST - Attach a payment method to customer
 */
export async function POST(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.PAYMENT_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  try {
    const body = await request.json();
    const { paymentMethodId, customerId, setAsDefault } = body;

    if (!paymentMethodId || !customerId) {
      return errorResponse('معرف طريقة الدفع ومعرف العميل مطلوبان', 'MISSING_FIELDS', 400);
    }

    // SECURITY: In multi-tenant mode, verify the Stripe customer belongs to user's org
    if (process.env.MULTI_TENANT === 'true' && ctx.organizationId) {
      const org = await db.organization.findFirst({
        where: { id: ctx.organizationId, stripeCustomerId: customerId },
        select: { id: true },
      });
      if (!org) {
        return forbiddenResponse('Customer does not belong to your organization');
      }
    }

    // Attach payment method
    const method = await attachPaymentMethod(paymentMethodId, customerId);

    if (!method) {
      return errorResponse('فشل في إضافة طريقة الدفع', 'ATTACH_ERROR', 500);
    }

    // Set as default if requested
    if (setAsDefault) {
      await setDefaultPaymentMethod(customerId, paymentMethodId);
    }

    return successResponse({
      message: setAsDefault
        ? 'تم إضافة طريقة الدفع وتعيينها كافتراضية'
        : 'تم إضافة طريقة الدفع بنجاح',
      paymentMethod: {
        id: method.id,
        type: method.type,
        card: method.card ? {
          brand: method.card.brand,
          last4: method.card.last4,
          expMonth: method.card.exp_month,
          expYear: method.card.exp_year,
        } : null,
      },
    });
  } catch (error) {
    log.error('Attach payment method error:', error);
    return errorResponse(
      'حدث خطأ أثناء إضافة طريقة الدفع',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * DELETE - Detach a payment method
 */
export async function DELETE(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.PAYMENT_DELETE);
  if ('error' in rbac) return rbac.error;

  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  try {
    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return errorResponse('معرف طريقة الدفع مطلوب', 'MISSING_PAYMENT_METHOD_ID', 400);
    }

    const method = await detachPaymentMethod(paymentMethodId);

    if (!method) {
      return errorResponse('فشل في إزالة طريقة الدفع', 'DETACH_ERROR', 500);
    }

    return successResponse({
      message: 'تم إزالة طريقة الدفع بنجاح',
    });
  } catch (error) {
    log.error('Detach payment method error:', error);
    return errorResponse(
      'حدث خطأ أثناء إزالة طريقة الدفع',
      'INTERNAL_ERROR',
      500
    );
  }
}
