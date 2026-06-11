/**
 * Type helpers for Stripe SDK objects.
 *
 * The Stripe SDK types for webhooks and expanded objects are complex and
 * don't always expose nested properties (like `current_period_start` on
 * `Subscription`, or `customer` as a string on `Invoice`).
 *
 * Instead of scattering `as unknown as Record<string, unknown>` throughout
 * the codebase, we define focused interfaces here that describe exactly the
 * properties we access, and provide typed extraction helpers.
 */

import type Stripe from 'stripe';

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Subscription — period & cancellation fields
// ─────────────────────────────────────────────────────────────────────────────

/** Subset of Stripe.Subscription fields we access via dynamic property names */
export interface StripeSubscriptionPeriod {
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
}

/**
 * Safely extract period fields from a Stripe Subscription.
 * Stripe's TS types expose these as numbers on the Subscription object,
 * but the SDK version may lag, so we assert through a known interface.
 */
export function getSubscriptionPeriod(
  subscription: Stripe.Subscription,
n): StripeSubscriptionPeriod {
  // Stripe SDK types don't expose these as top-level properties in all versions,
  // but they are always present at runtime per the Stripe API spec.
  return {
    current_period_start: subscription.current_period_start as number,
    current_period_end: subscription.current_period_end as number,
    cancel_at_period_end: subscription.cancel_at_period_end as boolean,
    canceled_at: subscription.canceled_at as number | null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Invoice — dynamic fields
// ─────────────────────────────────────────────────────────────────────────────

/** Subset of Stripe.Invoice fields accessed via dynamic property names */
export interface StripeInvoiceFields {
  customer: string | { id: string };
  payment_intent: string | { id: string } | null;
  subscription: string | { id: string } | null;
}

/**
 * Safely extract dynamic fields from a Stripe Invoice.
 * In webhook events, `customer`, `payment_intent`, and `subscription`
 * may be string IDs or expanded objects depending on API version.
 */
export function getInvoiceFields(
  invoice: Stripe.Invoice,
): StripeInvoiceFields {
  return {
    customer: invoice.customer as string | { id: string },
    payment_intent: invoice.payment_intent as string | { id: string } | null,
    subscription: invoice.subscription as string | { id: string } | null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Promotion Code — expanded coupon
// ─────────────────────────────────────────────────────────────────────────────

/** Promotion code with expanded coupon object */
export interface StripePromoCodeWithCoupon {
  coupon: Stripe.Coupon | string;
}

/**
 * Safely extract the coupon from a promotion code.
 * The `coupon` field may be expanded (full object) or just a string ID.
 */
export function getPromoCodeCoupon(
  promoCode: Stripe.PromotionCode,
): Stripe.Coupon | string | undefined {
  // coupon may be expanded (full object) or just a string ID depending on API version
  return promoCode.coupon as Stripe.Coupon | string | undefined;
}
