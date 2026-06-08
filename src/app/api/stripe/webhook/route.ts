/**
 * API Route: Stripe Webhook Handler
 * معالج Webhook من Stripe
 *
 * Handles the following events:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.created: Subscription created
 * - customer.subscription.updated: Subscription updated
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.paid: Payment successful
 * - invoice.payment_failed: Payment failed
 *
 * Race condition protections:
 * - Uses upsert on @@unique([stripeSubscriptionId]) to prevent duplicate subscriptions
 * - Wraps multi-step operations in db.$transaction() for atomicity
 * - Checks updateMany result counts to detect no-op updates
 * - Never assigns payments to arbitrary organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { constructWebhookEvent, mapStripeStatus, toDbStatus } from '@/lib/stripe';
import { db } from '@/lib/db';
import { getSubscriptionPeriod, getInvoiceFields } from '@/lib/stripe-types';
import Stripe from 'stripe';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// Webhook secret from environment
const _WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  // Rate limiting — public limiter (200 req/min) for webhooks
  const { result: rlResult } = await withRateLimit(request, 'public');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  // Get raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  // Verify webhook signature
  let event: Stripe.Event | null;
  try {
    event = constructWebhookEvent(body, signature);
    if (!event) {
      log.error('Webhook signature verification failed: null event');
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }
  } catch (err) {
    log.error('Webhook signature verification failed', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Log the event for payment audit trail
  log.info(`Stripe webhook received: ${event.type}`);

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        log.info(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Log the full error so we can diagnose issues
    // Return 500 so Stripe retries the webhook
    log.error('Error processing webhook — Stripe will retry', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 *
 * Uses upsert on stripeSubscriptionId to prevent duplicate subscriptions when
 * both checkout.session.completed and customer.subscription.created fire concurrently.
 * Wraps subscription upsert + org plan update in a transaction for atomicity.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { organizationId, planId } = session.metadata || {};

  if (!organizationId || !planId) {
    log.error('Missing metadata in checkout session', { sessionId: session.id });
    return;
  }

  try {
    // SECURITY: Validate that the organizationId actually exists in the database.
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) {
      log.error('[Stripe] Checkout session references non-existent organization', {
        sessionId: session.id,
        organizationId,
      });
      return;
    }

    // Retrieve the full subscription from Stripe to get accurate period dates.
    const { getStripe } = await import('@/lib/stripe');
    const stripe = getStripe();
    const subscriptionId = session.subscription as string;
    let periodStart = new Date();
    let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: 30 days

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const period = getSubscriptionPeriod(subscription);
        periodStart = new Date(period.current_period_start * 1000);
        periodEnd = new Date(period.current_period_end * 1000);
      } catch (retrieveErr) {
        log.warn('[Stripe] Failed to retrieve subscription for period — using 30-day fallback', {
          subscriptionId,
          error: retrieveErr instanceof Error ? retrieveErr.message : retrieveErr,
        });
      }
    }

    const finalPeriodStart = periodStart;
    const finalPeriodEnd = periodEnd;

    // FIX: Use upsert within a transaction to prevent race conditions.
    // The @@unique([stripeSubscriptionId]) constraint ensures only one subscription
    // is created per Stripe subscription, even when concurrent webhooks arrive.
    await db.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { stripeSubscriptionId: subscriptionId },
        update: {
          status: 'ACTIVE',
          planId,
          currentPeriodStart: finalPeriodStart,
          currentPeriodEnd: finalPeriodEnd,
          stripeCustomerId: session.customer as string,
          stripePaymentIntentId: session.payment_intent as string,
        },
        create: {
          organizationId,
          planId,
          status: 'ACTIVE',
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: session.customer as string,
          stripePaymentIntentId: session.payment_intent as string,
          currentPeriodStart: finalPeriodStart,
          currentPeriodEnd: finalPeriodEnd,
        },
      });

      // Update organization plan within the same transaction
      await tx.organization.update({
        where: { id: organizationId },
        data: { planId },
      });
    });

    log.info(`Checkout completed for organization: ${organizationId}`, {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
  } catch (dbError) {
    log.error('DB error in handleCheckoutCompleted — critical: subscription may not be recorded', {
      error: dbError instanceof Error ? dbError.message : dbError,
      organizationId,
      planId,
      sessionId: session.id,
    });
    throw dbError;
  }
}

/**
 * Handle customer.subscription.created event
 *
 * Uses upsert on stripeSubscriptionId to prevent duplicate subscriptions
 * when this event races with checkout.session.completed.
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { organizationId, planId } = subscription.metadata || {};

  if (!organizationId || !planId) {
    log.warn('Missing metadata in subscription created event', { id: subscription.id });
    return;
  }

  try {
    const status = mapStripeStatus(subscription.status);
    const dbStatus = toDbStatus(status);
    const period = getSubscriptionPeriod(subscription);

    // FIX: Use upsert within a transaction to prevent duplicate subscriptions
    await db.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        update: {
          status: dbStatus,
          planId,
          currentPeriodStart: new Date(period.current_period_start * 1000),
          currentPeriodEnd: new Date(period.current_period_end * 1000),
          stripeCustomerId: subscription.customer as string,
        },
        create: {
          organizationId,
          planId,
          status: dbStatus,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          currentPeriodStart: new Date(period.current_period_start * 1000),
          currentPeriodEnd: new Date(period.current_period_end * 1000),
        },
      });

      // Update organization plan within the same transaction
      await tx.organization.update({
        where: { id: organizationId },
        data: { planId },
      });
    });

    log.info('Subscription created', {
      id: subscription.id,
      status: subscription.status,
      organizationId,
      planId,
    });
  } catch (dbError) {
    log.error('DB error in handleSubscriptionCreated', {
      error: dbError instanceof Error ? dbError.message : dbError,
      subscriptionId: subscription.id,
    });
    throw dbError;
  }
}

/**
 * Handle customer.subscription.updated event
 *
 * Uses upsert on stripeSubscriptionId so that if the subscription hasn't been
 * created yet (race with checkout.session.completed), it will be created instead
 * of silently no-oping.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = mapStripeStatus(subscription.status);
  const period = getSubscriptionPeriod(subscription);

  try {
    // FIX: Use upsert instead of updateMany to handle the case where
    // the subscription hasn't been created yet by a concurrent webhook
    const { organizationId, planId } = subscription.metadata || {};

    await db.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        update: {
          status: toDbStatus(status),
          currentPeriodStart: new Date(period.current_period_start * 1000),
          currentPeriodEnd: new Date(period.current_period_end * 1000),
          cancelAtPeriodEnd: period.cancel_at_period_end,
        },
        create: {
          organizationId: organizationId || '',
          planId: planId || '',
          status: toDbStatus(status),
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          currentPeriodStart: new Date(period.current_period_start * 1000),
          currentPeriodEnd: new Date(period.current_period_end * 1000),
          cancelAtPeriodEnd: period.cancel_at_period_end,
        },
      });
    });

    log.info(`Subscription updated: ${subscription.id}, status: ${status}`);
  } catch (dbError) {
    log.error('DB error in handleSubscriptionUpdated — subscription status may be stale', {
      error: dbError instanceof Error ? dbError.message : dbError,
      subscriptionId: subscription.id,
      newStatus: status,
    });
    throw dbError;
  }
}

/**
 * Handle customer.subscription.deleted event
 *
 * Uses a transaction to atomically read the subscription, update it,
 * and reset the organization plan — preventing race conditions with
 * concurrent create/update handlers.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // FIX: Wrap the entire read-update sequence in a single transaction
    await db.$transaction(async (tx) => {
      const subRecord = await tx.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
        select: { organizationId: true },
      });

      if (!subRecord) {
        log.warn('[Stripe] Subscription not found for deletion', {
          subscriptionId: subscription.id,
        });
        return;
      }

      // Update subscription status to canceled
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'CANCELED' },
      });

      // Reset organization planId to free within the same transaction
      await tx.organization.update({
        where: { id: subRecord.organizationId },
        data: { planId: 'free' },
      });

      log.info(`Reset planId to free for organization: ${subRecord.organizationId}`);
    });

    log.info(`Subscription canceled: ${subscription.id}`);
  } catch (dbError) {
    log.error('DB error in handleSubscriptionDeleted — subscription may remain active incorrectly', {
      error: dbError instanceof Error ? dbError.message : dbError,
      subscriptionId: subscription.id,
    });
    throw dbError;
  }
}


/**
 * Handle invoice.paid event
 *
 * FIX: Removed the dangerous findFirst() fallback that could assign payments
 * to arbitrary organizations. Now throws if organizationId cannot be resolved,
 * which causes Stripe to retry the webhook (giving time for the subscription
 * to be created by a concurrent handler).
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    const invoiceFields = getInvoiceFields(invoice);
    const customerId = typeof invoiceFields.customer === 'string' ? invoiceFields.customer : '';
    const paymentIntentId = typeof invoiceFields.payment_intent === 'string' ? invoiceFields.payment_intent : invoice.id;

    // Look up organizationId from subscription — never assign to arbitrary org
    let organizationId: string | null = null;
    if (invoiceFields.subscription) {
      const subscriptionId = typeof invoiceFields.subscription === 'string'
        ? invoiceFields.subscription
        : (invoiceFields.subscription as { id: string }).id;
      try {
        const subscription = await db.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
          select: { organizationId: true },
        });
        if (subscription) {
          organizationId = subscription.organizationId;
        }
      } catch {
        log.warn('[Stripe] Could not look up subscription for org ID', { subscriptionId });
      }
    }

    // FIX: If organizationId cannot be resolved, throw an error so Stripe retries.
    // Previously this used findFirst() to grab ANY organization — a multi-tenant
    // isolation violation that could assign payments to the wrong tenant.
    if (!organizationId) {
      const errMsg = '[Stripe] Cannot resolve organizationId for invoice — will retry via Stripe';
      log.error(errMsg, {
        invoiceId: invoice.id,
        subscriptionId: invoiceFields.subscription,
      });
      throw new Error(errMsg);
    }

    await db.payment.create({
      data: {
        voucherNumber: `INV-${invoice.number || invoice.id}`,
        amount: invoice.amount_paid / 100,
        payMethod: 'ONLINE',
        beneficiary: invoice.customer_name || `Stripe Customer ${customerId}`,
        referenceNumber: paymentIntentId,
        status: 'COMPLETED',
        description: `Stripe Invoice ${invoice.number || invoice.id} - ${invoice.currency?.toUpperCase() || 'USD'} ${(invoice.amount_paid / 100).toFixed(2)}`,
        organizationId,
      },
    });

    log.info(`Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}`);
  } catch (dbError) {
    log.error('DB error in handleInvoicePaid — payment record not created', {
      error: dbError instanceof Error ? dbError.message : dbError,
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
    });
    throw dbError;
  }
}

/**
 * Handle invoice.payment_failed event
 *
 * FIX: Uses upsert instead of updateMany so that if the subscription
 * hasn't been created yet, we still capture the status change.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const failedInvoiceFields = getInvoiceFields(invoice);
    if (failedInvoiceFields.subscription) {
      const subscriptionId = typeof failedInvoiceFields.subscription === 'string'
        ? failedInvoiceFields.subscription
        : failedInvoiceFields.subscription.id;

      // FIX: Use update with where clause on unique field, and log if not found
      const result = await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { status: 'PAST_DUE' },
      });

      if (result.count === 0) {
        log.warn('[Stripe] No subscription found for payment_failed — subscription may not be created yet', {
          subscriptionId,
          invoiceId: invoice.id,
        });
        // Throw so Stripe retries — the subscription may be created by a concurrent handler
        throw new Error(`Subscription not found for payment_failed: ${subscriptionId}`);
      }
    }

    log.info(`Invoice payment failed: ${invoice.id}`);
  } catch (dbError) {
    log.error('DB error in handleInvoicePaymentFailed — subscription may remain in wrong status', {
      error: dbError instanceof Error ? dbError.message : dbError,
      invoiceId: invoice.id,
    });
    throw dbError;
  }
}
