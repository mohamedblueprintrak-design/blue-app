/**
 * API Route: Stripe Invoices
 * مسار الفواتير Stripe
 *
 * GET - List or retrieve invoices
 * POST - Create invoice
 * PUT - Pay or finalize invoice
 * DELETE - Void invoice
 */

import { NextRequest} from 'next/server';
import type Stripe from 'stripe';
import {
  listInvoices,
  retrieveInvoice,
  createInvoice,
  finalizeInvoice,
  payInvoice,
  voidInvoice,
  isStripeConfigured,
} from '@/lib/stripe';
import { getInvoiceFields } from '@/lib/stripe-types';
import { successResponse, errorResponse, forbiddenResponse } from '../../utils/response';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { db } from '@/lib/db';

/**
 * GET - List or retrieve invoices
 */
export async function GET(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const invoiceId = searchParams.get('invoiceId');
    const limit = parseInt(searchParams.get('limit') || '10');

    // SECURITY: In multi-tenant mode, verify the Stripe customer belongs to user's org
    if (process.env.MULTI_TENANT === 'true' && ctx.organizationId && customerId) {
      const org = await db.organization.findFirst({
        where: { id: ctx.organizationId, stripeCustomerId: customerId },
        select: { id: true },
      });
      if (!org) {
        return forbiddenResponse('Customer does not belong to your organization');
      }
    }

    // Retrieve single invoice
    if (invoiceId) {
      const invoice = await retrieveInvoice(invoiceId);

      if (!invoice) {
        return errorResponse('الفاتورة غير موجودة', 'INVOICE_NOT_FOUND', 404);
      }

      // SECURITY: Verify invoice belongs to user's org via metadata
      const invOrgId = invoice.metadata?.organizationId as string | undefined;
      if (process.env.MULTI_TENANT === 'true' && ctx.organizationId && invOrgId && invOrgId !== ctx.organizationId) {
        return forbiddenResponse('Invoice does not belong to your organization');
      }

      return successResponse({
        invoice: formatInvoice(invoice),
      });
    }

    // List invoices
    if (!customerId) {
      return errorResponse('معرف العميل مطلوب', 'MISSING_CUSTOMER_ID', 400);
    }

    const invoices = await listInvoices(customerId, limit);

    if (!invoices) {
      return errorResponse('فشل في استرجاع الفواتير', 'INVOICES_ERROR', 500);
    }

    return successResponse({
      invoices: invoices.map(formatInvoice),
    });
  } catch (error) {
    log.error('Invoices retrieval error:', error);
    return errorResponse(
      'حدث خطأ أثناء استرجاع الفواتير',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * POST - Create invoice
 */
export async function POST(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  try {
    const body = await request.json();
    const { customerId, description, metadata, autoFinalize = false } = body;

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

    // SECURITY: Inject organizationId into metadata for future org verification
    const enrichedMetadata = {
      ...metadata,
      organizationId: ctx.organizationId || metadata?.organizationId,
    };

    const invoice = await createInvoice({
      customerId,
      description,
      metadata: enrichedMetadata,
    });

    if (!invoice) {
      return errorResponse('فشل في إنشاء الفاتورة', 'INVOICE_CREATE_ERROR', 500);
    }

    // Auto-finalize if requested
    if (autoFinalize) {
      await finalizeInvoice(invoice.id);
    }

    return successResponse({
      invoice: formatInvoice(invoice),
      message: 'تم إنشاء الفاتورة بنجاح',
    });
  } catch (error) {
    log.error('Create invoice error:', error);
    return errorResponse(
      'حدث خطأ أثناء إنشاء الفاتورة',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * PUT - Pay or finalize invoice
 */
export async function PUT(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_UPDATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  try {
    const body = await request.json();
    const { invoiceId, action } = body;

    if (!invoiceId) {
      return errorResponse('معرف الفاتورة مطلوب', 'MISSING_INVOICE_ID', 400);
    }

    // SECURITY: Verify invoice belongs to user's org before modifying
    const existingInvoice = await retrieveInvoice(invoiceId);
    if (existingInvoice) {
      const invOrgId = existingInvoice.metadata?.organizationId as string | undefined;
      if (process.env.MULTI_TENANT === 'true' && ctx.organizationId && invOrgId && invOrgId !== ctx.organizationId) {
        return forbiddenResponse('Invoice does not belong to your organization');
      }
    }

    let invoice;

    if (action === 'finalize') {
      invoice = await finalizeInvoice(invoiceId);
      if (!invoice) {
        return errorResponse('فشل في تأكيد الفاتورة', 'FINALIZE_ERROR', 500);
      }
      return successResponse({
        invoice: formatInvoice(invoice),
        message: 'تم تأكيد الفاتورة',
      });
    }

    if (action === 'pay') {
      invoice = await payInvoice(invoiceId);
      if (!invoice) {
        return errorResponse('فشل في دفع الفاتورة', 'PAY_ERROR', 500);
      }
      return successResponse({
        invoice: formatInvoice(invoice),
        message: 'تم دفع الفاتورة بنجاح',
      });
    }

    return errorResponse('إجراء غير صحيح', 'INVALID_ACTION', 400);
  } catch (error) {
    log.error('Invoice action error:', error);
    return errorResponse(
      'حدث خطأ أثناء معالجة الفاتورة',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * DELETE - Void invoice
 */
export async function DELETE(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_DELETE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  if (!isStripeConfigured) {
    return errorResponse('نظام الدفع غير مُعد', 'STRIPE_NOT_CONFIGURED', 503);
  }

  try {
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return errorResponse('معرف الفاتورة مطلوب', 'MISSING_INVOICE_ID', 400);
    }

    // SECURITY: Verify invoice belongs to user's org before voiding
    const existingInvoice = await retrieveInvoice(invoiceId);
    if (existingInvoice) {
      const invOrgId = existingInvoice.metadata?.organizationId as string | undefined;
      if (process.env.MULTI_TENANT === 'true' && ctx.organizationId && invOrgId && invOrgId !== ctx.organizationId) {
        return forbiddenResponse('Invoice does not belong to your organization');
      }
    }

    const invoice = await voidInvoice(invoiceId);

    if (!invoice) {
      return errorResponse('فشل في إلغاء الفاتورة', 'VOID_ERROR', 500);
    }

    return successResponse({
      message: 'تم إلغاء الفاتورة بنجاح',
    });
  } catch (error) {
    log.error('Void invoice error:', error);
    return errorResponse(
      'حدث خطأ أثناء إلغاء الفاتورة',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * Format invoice for API response
 */
function formatInvoice(invoice: Stripe.Invoice): Record<string, unknown> {
  const fields = getInvoiceFields(invoice);
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountPaid: invoice.amount_paid / 100,
    amountDue: invoice.amount_due / 100,
    currency: invoice.currency?.toUpperCase(),
    createdAt: invoice.created ? new Date(invoice.created * 1000) : null,
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    paidAt: invoice.status_transitions.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : null,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    customer: fields.customer,
    paymentIntent: fields.payment_intent,
    subscription: fields.subscription,
  };
}
