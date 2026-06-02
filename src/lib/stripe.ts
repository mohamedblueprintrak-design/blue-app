// @ts-check
/**
 * Stripe Configuration for BluePrint SaaS Platform
 * إعدادات Stripe لمنصة BluePrint
 * 
 * This module provides Stripe integration with graceful fallback
 * when Stripe is not configured.
 */

import Stripe from 'stripe';
import { getPromoCodeCoupon } from '@/lib/stripe-types';
import { log } from '@/lib/logger';

// ============================================
// Configuration
// ============================================

/** Check if Stripe is properly configured */
export const isStripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.length > 0);

/** Stripe webhook secret for signature verification */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/** Annual discount percentage */
export const ANNUAL_DISCOUNT_PERCENT = 20;

// ============================================
// Lazy Stripe Client
// ============================================

let _stripe: Stripe | null = null;

/**
 * Get Stripe client instance
 * Throws error if Stripe is not configured
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(secretKey, {
      // @ts-expect-error — Using stable API version instead of library's default
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Safe Stripe operation wrapper
 * Returns null if Stripe is not configured
 */
export async function safeStripeOp<T>(
  operation: (stripe: Stripe) => Promise<T>
): Promise<T | null> {
  if (!isStripeConfigured) {
    return null;
  }
  try {
    return await operation(getStripe());
  } catch (error: unknown) {
    const errorObj = error as Record<string, unknown>;
    const errorType = errorObj?.type ?? (error instanceof Error ? error.constructor.name : 'UnknownError');
    const errorCode = (errorObj?.code as string) ?? 'N/A';
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorType === 'StripeInvalidRequestError' || errorType === 'INVALID_REQUEST_ERROR') {
      log.warn(`[Stripe] Invalid request error (code: ${errorCode}): ${errorMessage}`);
    } else if (errorType === 'StripeAuthenticationError' || errorType === 'AUTHENTICATION_ERROR') {
      log.warn(`[Stripe] Authentication error (code: ${errorCode}): ${errorMessage}`);
    } else {
      log.error(`[Stripe] ${errorType} (code: ${errorCode}): ${errorMessage}`);
    }
    return null;
  }
}

// ============================================
// Pricing Plans
// ============================================

export interface PricingPlan {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  stripeProductId?: string;
  stripePriceId?: string;
  features: string[];
  limits: {
    projects: number;
    users: number;
    storage: number;
    invoices: number;
    aiCalls: number;
  };
  isActive: boolean;
  isPopular?: boolean;
}

/** Default pricing plans */
export const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    nameAr: 'المبتدئ',
    description: 'Perfect for small engineering offices',
    descriptionAr: 'مثالي للمكاتب الهندسية الصغيرة',
    price: 199,
    currency: 'AED',
    interval: 'month',
    features: [
      'Up to 5 projects',
      'Up to 3 users',
      '5GB storage',
      'Basic reports',
      'Email support',
      'AI assistant (100 calls/month)',
    ],
    limits: {
      projects: 5,
      users: 3,
      storage: 5,
      invoices: 50,
      aiCalls: 100,
    },
    isActive: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    nameAr: 'المحترف',
    description: 'Ideal for growing consultancies',
    descriptionAr: 'مثالي للمكاتب النامية',
    price: 499,
    currency: 'AED',
    interval: 'month',
    features: [
      'Up to 25 projects',
      'Up to 10 users',
      '25GB storage',
      'Advanced reports & analytics',
      'Priority support',
      'AI assistant (500 calls/month)',
      'Client portal',
      'API access',
    ],
    limits: {
      projects: 25,
      users: 10,
      storage: 25,
      invoices: 500,
      aiCalls: 500,
    },
    isActive: true,
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    nameAr: 'المؤسسي',
    description: 'For large engineering firms',
    descriptionAr: 'للمؤسسات الهندسية الكبيرة',
    price: 999,
    currency: 'AED',
    interval: 'month',
    features: [
      'Unlimited projects',
      'Unlimited users',
      '100GB storage',
      'Custom reports & dashboards',
      '24/7 dedicated support',
      'AI assistant (unlimited)',
      'Client & contractor portals',
      'Full API access',
      'Custom integrations',
      'On-premise deployment option',
    ],
    limits: {
      projects: -1,
      users: -1,
      storage: 100,
      invoices: -1,
      aiCalls: -1,
    },
    isActive: true,
  },
];

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate annual price with discount
 */
export function calculateAnnualPrice(monthlyPrice: number): number {
  const annualBeforeDiscount = monthlyPrice * 12;
  const discount = annualBeforeDiscount * (ANNUAL_DISCOUNT_PERCENT / 100);
  return Math.round(annualBeforeDiscount - discount);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'AED'): string {
  const formatter = new Intl.NumberFormat('ar-AE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

export function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
    trialing: 'TRIALING',
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'EXPIRED',
    paused: 'PAUSED',
  };
  return statusMap[stripeStatus] || 'unknown';
}


// ============================================
// Stripe Operations (require configuration)
// ============================================

/**
 * Create Stripe customer
 */
export async function createStripeCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer | null> {
  return safeStripeOp(async (s) => {
    return s.customers.create({
      email,
      name,
      metadata: {
        ...metadata,
        platform: 'blueprint',
      },
    });
  });
}

/**
 * Create checkout session
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session | null> {
  return safeStripeOp(async (s) => {
    return s.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: {
        metadata: params.metadata,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });
  });
}

/**
 * Create billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session | null> {
  return safeStripeOp(async (s) => {
    return s.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  });
}

/**
 * Get subscription
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  return safeStripeOp(async (s) => {
    return s.subscriptions.retrieve(subscriptionId);
  });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription | null> {
  return safeStripeOp(async (s) => {
    if (cancelAtPeriodEnd) {
      return s.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
    return s.subscriptions.cancel(subscriptionId);
  });
}

// ============================================
// Payment Intents (One-time Payments)
// ============================================

/**
 * Create a payment intent for one-time payment
 */
export async function createPaymentIntent(params: {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent | null> {
  return safeStripeOp(async (s) => {
    return s.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      description: params.description,
      metadata: params.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  });
}

/**
 * Update a payment intent
 */
export async function updatePaymentIntent(
  paymentIntentId: string,
  params: {
    amount?: number;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.PaymentIntent | null> {
  return safeStripeOp(async (s) => {
    const updateData: Stripe.PaymentIntentUpdateParams = {};
    if (params.amount) {
      updateData.amount = Math.round(params.amount * 100);
    }
    if (params.metadata) {
      updateData.metadata = params.metadata;
    }
    return s.paymentIntents.update(paymentIntentId, updateData);
  });
}

/**
 * Retrieve a payment intent
 */
export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  return safeStripeOp(async (s) => {
    return s.paymentIntents.retrieve(paymentIntentId);
  });
}

// ============================================
// Customer Management
// ============================================

/**
 * Retrieve a customer
 */
export async function retrieveCustomer(customerId: string): Promise<Stripe.Customer | null> {
  return safeStripeOp(async (s) => {
    return await s.customers.retrieve(customerId) as Stripe.Customer;
  });
}

/**
 * Update a customer
 */
export async function updateCustomer(
  customerId: string,
  params: {
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.Customer | null> {
  return safeStripeOp(async (s) => {
    return s.customers.update(customerId, params);
  });
}

/**
 * List customer's payment methods
 */
export async function listPaymentMethods(
  customerId: string,
  type: 'card' = 'card'
): Promise<Stripe.PaymentMethod[] | null> {
  return safeStripeOp(async (s) => {
    const methods = await s.paymentMethods.list({
      customer: customerId,
      type,
    });
    return methods.data;
  });
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string
): Promise<Stripe.PaymentMethod | null> {
  return safeStripeOp(async (s) => {
    return s.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  });
}

/**
 * Detach a payment method
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod | null> {
  return safeStripeOp(async (s) => {
    return s.paymentMethods.detach(paymentMethodId);
  });
}

/**
 * Set default payment method for customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer | null> {
  return safeStripeOp(async (s) => {
    return s.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  });
}

// ============================================
// Subscription Management
// ============================================

/**
 * Create a subscription
 */
export async function createSubscription(params: {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription | null> {
  return safeStripeOp(async (s) => {
    return s.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      trial_period_days: params.trialPeriodDays,
      metadata: params.metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });
  });
}

/**
 * Update a subscription (upgrade/downgrade)
 */
export async function updateSubscription(
  subscriptionId: string,
  params: {
    newPriceId?: string;
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    metadata?: Record<string, string>;
  }
): Promise<Stripe.Subscription | null> {
  return safeStripeOp(async (s) => {
    // Get current subscription to find the item ID
    const subscription = await s.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0]?.id;

    if (!itemId) {
      throw new Error('No subscription item found');
    }

    const updateData: Stripe.SubscriptionUpdateParams = {
      proration_behavior: params.prorationBehavior || 'create_prorations',
      metadata: params.metadata,
    };

    if (params.newPriceId) {
      updateData.items = [{ id: itemId, price: params.newPriceId }];
    }

    return s.subscriptions.update(subscriptionId, updateData);
  });
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  return safeStripeOp(async (s) => {
    return s.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  });
}

// ============================================
// Invoice Management
// ============================================

/**
 * Create an invoice
 */
export async function createInvoice(params: {
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Invoice | null> {
  return safeStripeOp(async (s) => {
    return s.invoices.create({
      customer: params.customerId,
      description: params.description,
      metadata: params.metadata,
    });
  });
}

/**
 * Finalize an invoice
 */
export async function finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
  return safeStripeOp(async (s) => {
    return s.invoices.finalizeInvoice(invoiceId);
  });
}

/**
 * Pay an invoice
 */
export async function payInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
  return safeStripeOp(async (s) => {
    return s.invoices.pay(invoiceId);
  });
}

/**
 * List invoices for a customer
 */
export async function listInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[] | null> {
  return safeStripeOp(async (s) => {
    const invoices = await s.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  });
}

/**
 * Retrieve an invoice
 */
export async function retrieveInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
  return safeStripeOp(async (s) => {
    return s.invoices.retrieve(invoiceId);
  });
}

/**
 * Void an invoice
 */
export async function voidInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
  return safeStripeOp(async (s) => {
    return s.invoices.voidInvoice(invoiceId);
  });
}

// ============================================
// Billing Portal Configuration
// ============================================

/**
 * Create or retrieve billing portal configuration
 */
export async function getBillingPortalConfiguration(): Promise<Stripe.BillingPortal.Configuration | null> {
  return safeStripeOp(async (s) => {
    // List existing configurations
    const configs = await s.billingPortal.configurations.list({ limit: 1 });
    
    if (configs.data.length > 0) {
      return configs.data[0];
    }

    // Create a new configuration if none exists
    return s.billingPortal.configurations.create({
      features: {
        payment_method_update: {
          enabled: true,
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'promotion_code'],
          products: [], // Will be populated with actual products
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        invoice_history: {
          enabled: true,
        },
      },
    });
  });
}

/**
 * Create billing portal session with custom configuration
 */
export async function createBillingPortalSessionWithConfig(
  customerId: string,
  returnUrl: string,
  configurationId?: string
): Promise<Stripe.BillingPortal.Session | null> {
  return safeStripeOp(async (s) => {
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: returnUrl,
    };

    if (configurationId) {
      sessionParams.configuration = configurationId;
    }

    return s.billingPortal.sessions.create(sessionParams);
  });
}

// ============================================
// Promo Codes and Coupons
// ============================================

/**
 * Validate a promotion code
 */
export async function validatePromotionCode(code: string): Promise<{
  valid: boolean;
  coupon?: Stripe.Coupon;
  message?: string;
} | null> {
  const result = await safeStripeOp(async (s) => {
    try {
      // Search for the promotion code with coupon expanded
      const promoCodes = await s.promotionCodes.list({
        code,
      active: true,
        limit: 1,
        expand: ['data.coupon'],
      });

      if (promoCodes.data.length === 0) {
        return { valid: false, message: 'رمز الخصم غير صالح' };
      }

      const promoCode = promoCodes.data[0];
      
      // Get the coupon from the promotion code (may be expanded or just a string ID)
      const coupon = getPromoCodeCoupon(promoCode);
      
      if (!coupon) {
        return { valid: false, message: 'رمز الخصم غير صالح' };
      }

      // If coupon is a string ID, fetch the full details
      const fullCoupon = typeof coupon === 'string' 
        ? await s.coupons.retrieve(coupon)
        : coupon;
      
      return { valid: true, coupon: fullCoupon as Stripe.Coupon };
    } catch {
      return { valid: false, message: 'رمز الخصم غير صالح' };
    }
  });
  
  return result ?? { valid: false, message: 'فشل التحقق من رمز الخصم' };
}

// ============================================
// Webhook
// ============================================

/**
 * Construct webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!isStripeConfigured || !STRIPE_WEBHOOK_SECRET) {
    return null;
  }
  try {
    return getStripe().webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    log.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

// ============================================
// Utility: Sync Plans with Stripe
// ============================================

/**
 * Sync pricing plans with Stripe (creates products and prices if needed)
 * This should be run once during setup or when plans change
 */
export async function syncPlansWithStripe(
  plans: PricingPlan[]
): Promise<{ success: boolean; results: Array<{ planId: string; productId?: string; priceId?: string; error?: string }> }> {
  const results: Array<{ planId: string; productId?: string; priceId?: string; error?: string }> = [];

  if (!isStripeConfigured) {
    return { success: false, results: plans.map(p => ({ planId: p.id, error: 'Stripe not configured' })) };
  }

  const stripe = getStripe();

  for (const plan of plans) {
    try {
      // Create or update product
      let product: Stripe.Product;
      
      if (plan.stripeProductId) {
        product = await stripe.products.retrieve(plan.stripeProductId);
      } else {
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            planId: plan.id,
            features: plan.features.join(', '),
          },
        });
      }

      // Check if price already exists for this product with matching details (avoid duplicates)
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 10,
      });

      let price = existingPrices.data.find(
        (p) =>
          p.unit_amount === plan.price * 100 &&
          p.currency === plan.currency.toLowerCase() &&
          p.recurring?.interval === plan.interval
      );

      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.price * 100, // Convert to cents
          currency: plan.currency.toLowerCase(),
          recurring: {
            interval: plan.interval,
          },
          metadata: {
            planId: plan.id,
          },
        });
      }

      results.push({
        planId: plan.id,
        productId: product.id,
        priceId: price.id,
      });
    } catch (error) {
      results.push({
        planId: plan.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: results.every(r => !r.error),
    results,
  };
}
