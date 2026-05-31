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
 * IMPORTANT: Database errors are now properly logged and re-thrown so Stripe
 * retries the webhook. Previously, DB errors were silently swallowed with
 * "Database not available, logging event only" — this hid real data integrity
 * issues and caused data loss (e.g., paid subscriptions not recorded).
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { constructWebhookEvent, mapStripeStatus } from '@/lib/stripe';
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
 * Uses the Stripe subscription object to get the correct billing period
 * instead of hardcoding 30 days (which is wrong for annual plans).
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { organizationId, planId } = session.metadata || {};

  if (!organizationId || !planId) {
    log.error('Missing metadata in checkout session', { sessionId: session.id });
    return;
  }

  try {
    // SECURITY: Validate that the organizationId actually exists in the database.
    // This prevents a crafted webhook with a fake organizationId from creating
    // subscriptions linked to non-existent organizations.
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
    // The session object only contains the subscription ID, not the full details.
    // Use the shared Stripe instance from @/lib/stripe to ensure consistent API version.
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

    // Try to find existing subscription
    const existingSubscription = await db.subscription.findFirst({
      where: {
        stripeSubscriptionId: session.subscription as string,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
    } else {
      // Create new subscription
      await db.subscription.create({
        data: {
          organizationId,
          planId,
          status: 'ACTIVE',
          stripeSubscriptionId: session.subscription as string,
          stripeCustomerId: session.customer as string,
          stripePaymentIntentId: session.payment_intent as string,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    // Update organization plan
    await db.organization.update({
      where: { id: organizationId },
      data: {
        planId,
      },
    });

    log.info(`Checkout completed for organization: ${organizationId}`, {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
  } catch (dbError) {
    // Log the actual DB error with details so we can diagnose
    log.error('DB error in handleCheckoutCompleted — critical: subscription may not be recorded', {
      error: dbError instanceof Error ? dbError.message : dbError,
      organizationId,
      planId,
      sessionId: session.id,
    });
    // Re-throw so the outer catch returns 500 and Stripe retries
    throw dbError;
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { organizationId, planId } = subscription.metadata || {};

  log.info('Subscription created', {
    id: subscription.id,
    status: subscription.status,
    organizationId,
    planId,
  });
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Note: organizationId is available in subscription.metadata but we rely on
  // stripeSubscriptionId for lookup since metadata can be tampered with.
  const status = mapStripeStatus(subscription.status);
  
  try {
    // Update subscription in database
    await db.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        status: status as 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING',
        currentPeriodStart: new Date(getSubscriptionPeriod(subscription).current_period_start * 1000),
        currentPeriodEnd: new Date(getSubscriptionPeriod(subscription).current_period_end * 1000),
        cancelAtPeriodEnd: getSubscriptionPeriod(subscription).cancel_at_period_end,
      },
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
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { _organizationId } = subscription.metadata || {};

  try {
    // Update subscription status to canceled
    await db.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        status: 'CANCELED',
      },
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
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    // Create payment record using the actual Payment model fields
    const invoiceFields = getInvoiceFields(invoice);
    const customerId = typeof invoiceFields.customer === 'string' ? invoiceFields.customer : '';
    const paymentIntentId = typeof invoiceFields.payment_intent === 'string' ? invoiceFields.payment_intent : invoice.id;

    // SECURITY: Look up organizationId from subscription metadata to ensure
    // multi-tenant isolation for payment records
    let organizationId: string | null = null;
    if (invoiceFields.subscription) {
      const subscriptionId = typeof invoiceFields.subscription === 'string'
        ? invoiceFields.subscription
        : (invoiceFields.subscription as { id: string }).id;
      try {
        const subscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
          select: { organizationId: true },
        });
        if (subscription) {
          organizationId = subscription.organizationId;
        }
      } catch {
        // Subscription lookup failed — continue without orgId
        log.warn('[Stripe] Could not look up subscription for org ID', { subscriptionId });
      }
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
        ...(organizationId && { organizationId }),
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
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    // Update subscription status to past_due
    const failedInvoiceFields = getInvoiceFields(invoice);
    if (failedInvoiceFields.subscription) {
      const subscriptionId = typeof failedInvoiceFields.subscription === 'string' ? failedInvoiceFields.subscription : failedInvoiceFields.subscription.id;
      await db.subscription.updateMany({
        where: {
          stripeSubscriptionId: subscriptionId,
        },
        data: {
          status: 'PAST_DUE',
        },
      });
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
