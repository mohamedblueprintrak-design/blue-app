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
): StripeSubscriptionPeriod {
  return subscription as unknown as StripeSubscriptionPeriod;
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
  return invoice as unknown as StripeInvoiceFields;
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
  return (promoCode as unknown as StripePromoCodeWithCoupon).coupon;
}
