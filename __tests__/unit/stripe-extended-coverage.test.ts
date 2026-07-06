/**
 * Extended Tests for Stripe Module — Branch Coverage
 * Covers: safeStripeOp error branches, constructWebhookEvent,
 * retrieveCustomer (deleted), cancelSubscription, updatePaymentIntent,
 * updateSubscription, getBillingPortalConfiguration, createBillingPortalSessionWithConfig,
 * validatePromotionCode, syncPlansWithStripe
 *
 * IMPORTANT: jest.mock() does NOT intercept ESM imports in ts-jest ESM mode.
 * Instead, we intercept getStripe() via jest.spyOn on the exported function.
 * Since safeStripeOp calls getStripe() directly (not via module export),
 * we override the cached _stripe instance by calling getStripe() first
 * and replacing its methods.
 *
 * STRIPE_SECRET_KEY is set in jest.setup.ts (before any module loads).
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Suppress logger output
import { log } from '@/lib/logger';
jest.spyOn(log, 'warn').mockImplementation(() => {});
jest.spyOn(log, 'error').mockImplementation(() => {});
jest.spyOn(log, 'info').mockImplementation(() => {});

// Build a fake Stripe instance with all the methods used by stripe.ts
function createMockStripeInstance() {
  const instance: any = {
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    checkout: {
      sessions: { create: jest.fn() },
    },
    billingPortal: {
      sessions: { create: jest.fn() },
      configurations: {
        list: jest.fn(),
        create: jest.fn(),
      },
    },
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      create: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
      update: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentMethods: {
      list: jest.fn(),
      attach: jest.fn(),
      detach: jest.fn(),
    },
    invoices: {
      create: jest.fn(),
      finalizeInvoice: jest.fn(),
      pay: jest.fn(),
      list: jest.fn(),
      retrieve: jest.fn(),
      voidInvoice: jest.fn(),
    },
    products: {
      retrieve: jest.fn(),
      create: jest.fn(),
    },
    prices: {
      list: jest.fn(),
      create: jest.fn(),
    },
    promotionCodes: {
      list: jest.fn(),
    },
    coupons: {
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  return instance;
}

// The shared mock instance used by all tests
const mockStripeInstance = createMockStripeInstance();

// Import stripe module AFTER logger spy is set up
import * as stripeModule from '@/lib/stripe';

// Override getStripe to return our mock instance.
// We use Object.defineProperty because the module exports are frozen in ESM,
// but jest.spyOn can still replace the function via the module namespace.
// Since internal calls use the local binding (not the export), we instead
// pre-populate the singleton by calling getStripe() once, then replace
// every property on the returned instance.
const realGetStripe = stripeModule.getStripe;
const realInstance = realGetStripe();
// Replace all methods on the real instance with our mocks
for (const key of Object.keys(mockStripeInstance)) {
  (realInstance as any)[key] = mockStripeInstance[key];
}

const {
  isStripeConfigured,
  createStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  cancelSubscription,
  createPaymentIntent,
  updatePaymentIntent,
  retrievePaymentIntent,
  retrieveCustomer,
  updateCustomer,
  listPaymentMethods,
  attachPaymentMethod,
  detachPaymentMethod,
  setDefaultPaymentMethod,
  createSubscription,
  updateSubscription,
  reactivateSubscription,
  createInvoice,
  finalizeInvoice,
  payInvoice,
  listInvoices,
  retrieveInvoice,
  voidInvoice,
  getBillingPortalConfiguration,
  createBillingPortalSessionWithConfig,
  validatePromotionCode,
  constructWebhookEvent,
  syncPlansWithStripe,
} = stripeModule;

// ═══════════════════════════════════════════════════════════════════════
// 1. getStripe and isStripeConfigured
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — getStripe and isStripeConfigured', () => {
  it('isStripeConfigured should be true when STRIPE_SECRET_KEY is set', () => {
    expect(isStripeConfigured).toBe(true);
  });

  it('getStripe should return a Stripe instance', () => {
    const stripe = realGetStripe();
    expect(stripe).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. safeStripeOp — error branches
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — safeStripeOp error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle StripeInvalidRequestError', async () => {
    const error: any = new Error('Invalid request');
    error.type = 'StripeInvalidRequestError';
    error.code = 'resource_missing';

    mockStripeInstance.customers.create.mockRejectedValue(error);

    const result = await createStripeCustomer('test@test.com', 'Test User');
    expect(result).toBeNull();
  });

  it('should handle StripeAuthenticationError', async () => {
    const error: any = new Error('Auth error');
    error.type = 'StripeAuthenticationError';
    error.code = 'authentication_required';

    mockStripeInstance.customers.create.mockRejectedValue(error);

    const result = await createStripeCustomer('test@test.com', 'Test User');
    expect(result).toBeNull();
  });

  it('should handle INVALID_REQUEST_ERROR string type', async () => {
    const error: any = new Error('Invalid');
    error.type = 'INVALID_REQUEST_ERROR';
    error.code = 'invalid';

    mockStripeInstance.customers.create.mockRejectedValue(error);

    const result = await createStripeCustomer('test@test.com', 'Test User');
    expect(result).toBeNull();
  });

  it('should handle AUTHENTICATION_ERROR string type', async () => {
    const error: any = new Error('Auth failed');
    error.type = 'AUTHENTICATION_ERROR';
    error.code = 'auth_fail';

    mockStripeInstance.customers.create.mockRejectedValue(error);

    const result = await createStripeCustomer('test@test.com', 'Test User');
    expect(result).toBeNull();
  });

  it('should handle other error types (falls to else branch)', async () => {
    const error: any = new Error('Card error');
    error.type = 'StripeCardError';
    error.code = 'card_declined';

    mockStripeInstance.customers.create.mockRejectedValue(error);

    const result = await createStripeCustomer('test@test.com', 'Test User');
    expect(result).toBeNull();
  });

  it('should handle non-Error objects (string error)', async () => {
    mockStripeInstance.customers.create.mockRejectedValue('string error');

    const result = await createStripeCustomer('test@test.com', 'Test User');
    expect(result).toBeNull();
  });

  it('should handle error without type property (uses constructor name)', async () => {
    const error = new Error('Some error');
    mockStripeInstance.customers.create.mockRejectedValue(error);

    const result = await createStripeCustomer('test@test.com', 'Test User');
    expect(result).toBeNull();
  });

  it('should handle error with type but no code', async () => {
    const error: any = { type: 'SomeType', message: 'Some message' };
    mockStripeInstance.customers.create.mockRejectedValue(error);

    const result = await createStripeCustomer('test@test.com', 'Test User');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. constructWebhookEvent — branches
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — constructWebhookEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw on invalid webhook signature', () => {
    mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    expect(() => constructWebhookEvent('payload', 'bad_sig')).toThrow('Invalid webhook signature');
  });

  it('should return event on valid signature', () => {
    const mockEvent = { id: 'evt_123', type: 'checkout.session.completed' };
    mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

    const result = constructWebhookEvent('payload', 'valid_sig');
    expect(result).toEqual(mockEvent);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. retrieveCustomer — deleted branch
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — retrieveCustomer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when customer is deleted', async () => {
    mockStripeInstance.customers.retrieve.mockResolvedValue({
      id: 'cus_123',
      deleted: true,
    });

    const result = await retrieveCustomer('cus_123');
    expect(result).toBeNull();
  });

  it('should return customer when not deleted', async () => {
    mockStripeInstance.customers.retrieve.mockResolvedValue({
      id: 'cus_123',
      email: 'test@test.com',
    });

    const result = await retrieveCustomer('cus_123');
    expect(result).not.toBeNull();
    expect((result as any).id).toBe('cus_123');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. cancelSubscription — cancelAtPeriodEnd branch
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — cancelSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update cancel_at_period_end when cancelAtPeriodEnd is true (default)', async () => {
    mockStripeInstance.subscriptions.update.mockResolvedValue({ id: 'sub_123', cancel_at_period_end: true });

    await cancelSubscription('sub_123');
    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      cancel_at_period_end: true,
    });
  });

  it('should cancel immediately when cancelAtPeriodEnd is false', async () => {
    mockStripeInstance.subscriptions.cancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' });

    await cancelSubscription('sub_123', false);
    expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. updatePaymentIntent — amount/metadata branches
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — updatePaymentIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update amount when provided', async () => {
    mockStripeInstance.paymentIntents.update.mockResolvedValue({ id: 'pi_123' });

    await updatePaymentIntent('pi_123', { amount: 2000 });
    expect(mockStripeInstance.paymentIntents.update).toHaveBeenCalledWith('pi_123', {
      amount: 200000,
    });
  });

  it('should update metadata when provided', async () => {
    mockStripeInstance.paymentIntents.update.mockResolvedValue({ id: 'pi_123' });

    await updatePaymentIntent('pi_123', { metadata: { key: 'value' } });
    expect(mockStripeInstance.paymentIntents.update).toHaveBeenCalledWith('pi_123', {
      metadata: { key: 'value' },
    });
  });

  it('should update both amount and metadata', async () => {
    mockStripeInstance.paymentIntents.update.mockResolvedValue({ id: 'pi_123' });

    await updatePaymentIntent('pi_123', { amount: 500, metadata: { orderId: '123' } });
    expect(mockStripeInstance.paymentIntents.update).toHaveBeenCalledWith('pi_123', {
      amount: 50000,
      metadata: { orderId: '123' },
    });
  });

  it('should handle zero amount (falsy but valid)', async () => {
    mockStripeInstance.paymentIntents.update.mockResolvedValue({ id: 'pi_123' });

    await updatePaymentIntent('pi_123', { amount: 0 });
    expect(mockStripeInstance.paymentIntents.update).toHaveBeenCalledWith('pi_123', {});
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. updateSubscription — itemId and newPriceId branches
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — updateSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no subscription item found', async () => {
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      items: { data: [] },
    });

    const result = await updateSubscription('sub_123', { newPriceId: 'price_new' });
    expect(result).toBeNull();
  });

  it('should update with new price when provided', async () => {
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      items: { data: [{ id: 'si_123' }] },
    });
    mockStripeInstance.subscriptions.update.mockResolvedValue({ id: 'sub_123' });

    await updateSubscription('sub_123', { newPriceId: 'price_new' });
    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      proration_behavior: 'create_prorations',
      metadata: undefined,
      items: [{ id: 'si_123', price: 'price_new' }],
    });
  });

  it('should update without new price', async () => {
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      items: { data: [{ id: 'si_123' }] },
    });
    mockStripeInstance.subscriptions.update.mockResolvedValue({ id: 'sub_123' });

    await updateSubscription('sub_123', { metadata: { key: 'val' } });
    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      proration_behavior: 'create_prorations',
      metadata: { key: 'val' },
    });
  });

  it('should use custom proration behavior', async () => {
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      items: { data: [{ id: 'si_123' }] },
    });
    mockStripeInstance.subscriptions.update.mockResolvedValue({ id: 'sub_123' });

    await updateSubscription('sub_123', {
      newPriceId: 'price_new',
      prorationBehavior: 'none',
    });
    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      proration_behavior: 'none',
      metadata: undefined,
      items: [{ id: 'si_123', price: 'price_new' }],
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. getBillingPortalConfiguration — branches
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — getBillingPortalConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing configuration when one exists', async () => {
    mockStripeInstance.billingPortal.configurations.list.mockResolvedValue({
      data: [{ id: 'bpc_123' }],
    });

    const result = await getBillingPortalConfiguration();
    expect(result).not.toBeNull();
    expect((result as any).id).toBe('bpc_123');
  });

  it('should create new configuration when none exists', async () => {
    mockStripeInstance.billingPortal.configurations.list.mockResolvedValue({
      data: [],
    });
    mockStripeInstance.billingPortal.configurations.create.mockResolvedValue({ id: 'bpc_new' });

    const result = await getBillingPortalConfiguration();
    expect(result).not.toBeNull();
    expect((result as any).id).toBe('bpc_new');
    expect(mockStripeInstance.billingPortal.configurations.create).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. createBillingPortalSessionWithConfig — branches
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — createBillingPortalSessionWithConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create session with configuration ID when provided', async () => {
    mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({ id: 'bps_123' });

    const result = await createBillingPortalSessionWithConfig('cus_123', 'https://return.url', 'bpc_123');
    expect(result).not.toBeNull();
    expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        return_url: 'https://return.url',
        configuration: 'bpc_123',
      })
    );
  });

  it('should create session without configuration ID when not provided', async () => {
    mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({ id: 'bps_123' });

    const result = await createBillingPortalSessionWithConfig('cus_123', 'https://return.url');
    expect(result).not.toBeNull();
    expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        return_url: 'https://return.url',
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. validatePromotionCode — branches
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — validatePromotionCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return invalid result when no promotion codes found', async () => {
    mockStripeInstance.promotionCodes.list.mockResolvedValue({ data: [] });

    const result = await validatePromotionCode('INVALID_CODE');
    expect(result).not.toBeNull();
    expect(result?.valid).toBe(false);
  });

  it('should return invalid result when coupon is null', async () => {
    mockStripeInstance.promotionCodes.list.mockResolvedValue({
      data: [{ id: 'promo_123', coupon: null }],
    });

    const result = await validatePromotionCode('VALID10');
    expect(result).not.toBeNull();
    expect(result?.valid).toBe(false);
  });

  it('should return discount when coupon exists as object', async () => {
    mockStripeInstance.promotionCodes.list.mockResolvedValue({
      data: [{ id: 'promo_123', coupon: { id: 'coupon_123', percent_off: 10 } }],
    });

    const result = await validatePromotionCode('VALID10');
    expect(result).not.toBeNull();
    expect(result?.valid).toBe(true);
  });

  it('should handle error gracefully', async () => {
    mockStripeInstance.promotionCodes.list.mockRejectedValue(new Error('API error'));

    const result = await validatePromotionCode('VALID10');
    expect(result).not.toBeNull();
    expect(result?.valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. syncPlansWithStripe — branches
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — syncPlansWithStripe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testPlan = {
    id: 'starter',
    name: 'Starter',
    nameAr: 'البداية',
    description: 'Starter plan',
    descriptionAr: 'الباقة الأولية',
    price: 20,
    currency: 'usd',
    interval: 'month' as const,
    features: ['feature1'],
    limits: { projects: 5, users: 5, storage: 1, invoices: 5, aiCalls: 10 },
    isActive: true,
  };

  it('should return results with existing product and matching price', async () => {
    mockStripeInstance.products.retrieve.mockResolvedValue({ id: 'prod_123' });
    mockStripeInstance.prices.list.mockResolvedValue({
      data: [{ id: 'price_123', unit_amount: 2000, currency: 'usd', recurring: { interval: 'month' } }],
    });

    const result = await syncPlansWithStripe([{ ...testPlan, stripeProductId: 'prod_123' }]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].productId).toBe('prod_123');
    expect(result.results[0].priceId).toBe('price_123');
  });

  it('should create new product when plan has no stripeProductId', async () => {
    mockStripeInstance.products.create.mockResolvedValue({ id: 'prod_new' });
    mockStripeInstance.prices.list.mockResolvedValue({
      data: [{ id: 'price_new', unit_amount: 2000, currency: 'usd', recurring: { interval: 'month' } }],
    });

    const result = await syncPlansWithStripe([testPlan]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].productId).toBe('prod_new');
    expect(mockStripeInstance.products.create).toHaveBeenCalled();
  });

  it('should create new price when existing prices do not match', async () => {
    mockStripeInstance.products.retrieve.mockResolvedValue({ id: 'prod_123' });
    mockStripeInstance.prices.list.mockResolvedValue({
      data: [{ id: 'price_old', unit_amount: 9999, currency: 'usd', recurring: { interval: 'month' } }],
    });
    mockStripeInstance.prices.create.mockResolvedValue({ id: 'price_new' });

    const result = await syncPlansWithStripe([{ ...testPlan, stripeProductId: 'prod_123' }]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].priceId).toBe('price_new');
    expect(mockStripeInstance.prices.create).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockStripeInstance.products.retrieve.mockRejectedValue(new Error('API error'));
    mockStripeInstance.products.create.mockRejectedValue(new Error('Create failed'));

    const result = await syncPlansWithStripe([{ ...testPlan, stripeProductId: 'prod_fail' }]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].error).toBeDefined();
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12. Other operations — success paths
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — other operations success paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createCheckoutSession should work', async () => {
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({ id: 'cs_123' });
    const result = await createCheckoutSession({
      customerId: 'cus_123',
      priceId: 'price_123',
      successUrl: 'https://success.url',
      cancelUrl: 'https://cancel.url',
    });
    expect(result).not.toBeNull();
  });

  it('createPaymentIntent with all fields', async () => {
    mockStripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_123', client_secret: 'secret_123' });
    const result = await createPaymentIntent({
      amount: 100,
      currency: 'usd',
      customerId: 'cus_123',
      metadata: { orderId: '123' },
      idempotencyKey: 'idem_456',
    });
    expect(result).not.toBeNull();
    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        customer: 'cus_123',
      }),
      { idempotencyKey: 'idem_456' }
    );
  });

  it('createPaymentIntent without optional fields', async () => {
    mockStripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_123', client_secret: 'secret_123' });
    const result = await createPaymentIntent({
      amount: 50,
      currency: 'usd',
    });
    expect(result).not.toBeNull();
    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'usd',
      }),
      undefined
    );
  });

  it('createSubscription with idempotencyKey', async () => {
    mockStripeInstance.subscriptions.create.mockResolvedValue({ id: 'sub_123', status: 'active' });
    const result = await createSubscription({
      customerId: 'cus_123',
      priceId: 'price_123',
      trialPeriodDays: 14,
      idempotencyKey: 'idem_sub',
    });
    expect(result).not.toBeNull();
    expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        trial_period_days: 14,
      }),
      { idempotencyKey: 'idem_sub' }
    );
  });

  it('createSubscription without optional fields', async () => {
    mockStripeInstance.subscriptions.create.mockResolvedValue({ id: 'sub_123', status: 'active' });
    const result = await createSubscription({
      customerId: 'cus_123',
      priceId: 'price_123',
    });
    expect(result).not.toBeNull();
    expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
      }),
      undefined
    );
  });

  it('listPaymentMethods should return data array', async () => {
    mockStripeInstance.paymentMethods.list.mockResolvedValue({
      data: [{ id: 'pm_123' }],
    });
    const result = await listPaymentMethods('cus_123');
    expect(result).toEqual([{ id: 'pm_123' }]);
  });

  it('attachPaymentMethod should work', async () => {
    mockStripeInstance.paymentMethods.attach.mockResolvedValue({ id: 'pm_123' });
    const result = await attachPaymentMethod('pm_123', 'cus_123');
    expect(result).not.toBeNull();
  });

  it('detachPaymentMethod should work', async () => {
    mockStripeInstance.paymentMethods.detach.mockResolvedValue({ id: 'pm_123' });
    const result = await detachPaymentMethod('pm_123');
    expect(result).not.toBeNull();
  });

  it('setDefaultPaymentMethod should work', async () => {
    mockStripeInstance.customers.update.mockResolvedValue({ id: 'cus_123' });
    const result = await setDefaultPaymentMethod('cus_123', 'pm_123');
    expect(result).not.toBeNull();
  });

  it('reactivateSubscription should set cancel_at_period_end to false', async () => {
    mockStripeInstance.subscriptions.update.mockResolvedValue({ id: 'sub_123' });
    await reactivateSubscription('sub_123');
    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      cancel_at_period_end: false,
    });
  });

  it('createInvoice should work', async () => {
    mockStripeInstance.invoices.create.mockResolvedValue({ id: 'in_123' });
    const result = await createInvoice({ customerId: 'cus_123' });
    expect(result).not.toBeNull();
  });

  it('finalizeInvoice should work', async () => {
    mockStripeInstance.invoices.finalizeInvoice.mockResolvedValue({ id: 'in_123' });
    const result = await finalizeInvoice('in_123');
    expect(result).not.toBeNull();
  });

  it('payInvoice should work', async () => {
    mockStripeInstance.invoices.pay.mockResolvedValue({ id: 'in_123' });
    const result = await payInvoice('in_123');
    expect(result).not.toBeNull();
  });

  it('listInvoices should return data array', async () => {
    mockStripeInstance.invoices.list.mockResolvedValue({
      data: [{ id: 'in_123' }],
    });
    const result = await listInvoices('cus_123');
    expect(result).toEqual([{ id: 'in_123' }]);
  });

  it('retrieveInvoice should work', async () => {
    mockStripeInstance.invoices.retrieve.mockResolvedValue({ id: 'in_123' });
    const result = await retrieveInvoice('in_123');
    expect(result).not.toBeNull();
  });

  it('voidInvoice should work', async () => {
    mockStripeInstance.invoices.voidInvoice.mockResolvedValue({ id: 'in_123' });
    const result = await voidInvoice('in_123');
    expect(result).not.toBeNull();
  });

  it('getSubscription should work', async () => {
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({ id: 'sub_123' });
    const result = await getSubscription('sub_123');
    expect(result).not.toBeNull();
  });

  it('retrievePaymentIntent should work', async () => {
    mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_123' });
    const result = await retrievePaymentIntent('pi_123');
    expect(result).not.toBeNull();
  });

  it('updateCustomer should work', async () => {
    mockStripeInstance.customers.update.mockResolvedValue({ id: 'cus_123' });
    const result = await updateCustomer('cus_123', { email: 'new@test.com' });
    expect(result).not.toBeNull();
  });

  it('createBillingPortalSession should work', async () => {
    mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({ id: 'bps_123' });
    const result = await createBillingPortalSession('cus_123', 'https://return.url');
    expect(result).not.toBeNull();
  });

  it('createStripeCustomer should work', async () => {
    mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_new' });
    const result = await createStripeCustomer('test@test.com', 'Test User', { ref: 'abc' });
    expect(result).not.toBeNull();
  });
});
