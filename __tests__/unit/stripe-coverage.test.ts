/**
 * Tests for Stripe Module
 * Covers: isStripeConfigured, ANNUAL_DISCOUNT_PERCENT, calculateAnnualPrice,
 * formatPrice, mapStripeStatus, toDbStatus, DEFAULT_PLANS
 */

import { describe, it, expect, jest } from '@jest/globals';

import { log } from '@/lib/logger';
const mockLogWarn = jest.spyOn(log, 'warn').mockImplementation(() => {});
const mockLogError = jest.spyOn(log, 'error').mockImplementation(() => {});
const mockLogInfo = jest.spyOn(log, 'info').mockImplementation(() => {});

// Mock stripe-types
jest.mock('@/lib/stripe-types', () => ({
  getPromoCodeCoupon: jest.fn().mockReturnValue({ id: 'coupon_123', percent_off: 10 }),
}));

import {
  isStripeConfigured,
  ANNUAL_DISCOUNT_PERCENT,
  DEFAULT_PLANS,
  calculateAnnualPrice,
  formatPrice,
  mapStripeStatus,
  toDbStatus,
} from '@/lib/stripe';

// ═══════════════════════════════════════════════════════════════════════
// 1. Configuration & Constants
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — Configuration', () => {
  it('isStripeConfigured should be a boolean', () => {
    expect(typeof isStripeConfigured).toBe('boolean');
  });

  it('ANNUAL_DISCOUNT_PERCENT should be 20', () => {
    expect(ANNUAL_DISCOUNT_PERCENT).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. calculateAnnualPrice
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — calculateAnnualPrice', () => {
  it('should calculate annual price with 20% discount', () => {
    // 199 * 12 = 2388, 20% = 477.6, result = 1910.4 → 1910
    expect(calculateAnnualPrice(199)).toBe(1910);
  });

  it('should calculate for professional plan', () => {
    expect(calculateAnnualPrice(499)).toBe(4790);
  });

  it('should calculate for enterprise plan', () => {
    expect(calculateAnnualPrice(999)).toBe(9590);
  });

  it('should handle zero price', () => {
    expect(calculateAnnualPrice(0)).toBe(0);
  });

  it('should handle fractional price', () => {
    expect(calculateAnnualPrice(49.99)).toBe(480);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. formatPrice
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — formatPrice', () => {
  it('should format AED currency', () => {
    const result = formatPrice(199, 'AED');
    expect(typeof result).toBe('string');
    expect(result).toContain('199');
  });

  it('should format USD currency', () => {
    const result = formatPrice(100, 'USD');
    expect(typeof result).toBe('string');
    expect(result).toContain('100');
  });

  it('should default to AED when no currency specified', () => {
    const result = formatPrice(500);
    expect(typeof result).toBe('string');
    expect(result).toContain('500');
  });

  it('should handle zero amount', () => {
    const result = formatPrice(0);
    expect(typeof result).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. mapStripeStatus
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — mapStripeStatus', () => {
  it('should map active status', () => {
    expect(mapStripeStatus('active')).toBe('ACTIVE');
  });

  it('should map past_due status', () => {
    expect(mapStripeStatus('past_due')).toBe('PAST_DUE');
  });

  it('should map canceled status', () => {
    expect(mapStripeStatus('canceled')).toBe('CANCELED');
  });

  it('should map unpaid status', () => {
    expect(mapStripeStatus('unpaid')).toBe('UNPAID');
  });

  it('should map trialing status', () => {
    expect(mapStripeStatus('trialing')).toBe('TRIALING');
  });

  it('should map incomplete status', () => {
    expect(mapStripeStatus('incomplete')).toBe('INCOMPLETE');
  });

  it('should map incomplete_expired status', () => {
    expect(mapStripeStatus('incomplete_expired')).toBe('EXPIRED');
  });

  it('should map paused status', () => {
    expect(mapStripeStatus('paused')).toBe('PAUSED');
  });

  it('should return UNKNOWN for unrecognized status', () => {
    expect(mapStripeStatus('something_else' as never)).toBe('UNKNOWN');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. toDbStatus
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — toDbStatus', () => {
  it('should pass through valid DB statuses', () => {
    expect(toDbStatus('ACTIVE')).toBe('ACTIVE');
    expect(toDbStatus('PAST_DUE')).toBe('PAST_DUE');
    expect(toDbStatus('CANCELED')).toBe('CANCELED');
    expect(toDbStatus('TRIALING')).toBe('TRIALING');
  });

  it('should map invalid statuses to CANCELED', () => {
    expect(toDbStatus('UNPAID')).toBe('CANCELED');
    expect(toDbStatus('INCOMPLETE')).toBe('CANCELED');
    expect(toDbStatus('EXPIRED')).toBe('CANCELED');
    expect(toDbStatus('PAUSED')).toBe('CANCELED');
    expect(toDbStatus('UNKNOWN')).toBe('CANCELED');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. DEFAULT_PLANS
// ═══════════════════════════════════════════════════════════════════════

describe('Stripe — DEFAULT_PLANS', () => {
  it('should have 3 plans', () => {
    expect(DEFAULT_PLANS).toHaveLength(3);
  });

  it('should have starter plan', () => {
    const starter = DEFAULT_PLANS.find(p => p.id === 'starter');
    expect(starter).toBeDefined();
    expect(starter!.price).toBe(199);
    expect(starter!.currency).toBe('AED');
    expect(starter!.interval).toBe('month');
    expect(starter!.isActive).toBe(true);
  });

  it('should have professional plan as popular', () => {
    const pro = DEFAULT_PLANS.find(p => p.id === 'professional');
    expect(pro).toBeDefined();
    expect(pro!.price).toBe(499);
    expect(pro!.isPopular).toBe(true);
  });

  it('should have enterprise plan', () => {
    const enterprise = DEFAULT_PLANS.find(p => p.id === 'enterprise');
    expect(enterprise).toBeDefined();
    expect(enterprise!.price).toBe(999);
  });

  it('all plans should have Arabic names', () => {
    for (const plan of DEFAULT_PLANS) {
      expect(plan.nameAr).toBeTruthy();
      expect(plan.descriptionAr).toBeTruthy();
    }
  });

  it('all plans should have limits defined', () => {
    for (const plan of DEFAULT_PLANS) {
      expect(plan.limits).toBeDefined();
      expect(plan.limits.projects).toBeDefined();
      expect(plan.limits.users).toBeDefined();
      expect(plan.limits.storage).toBeDefined();
    }
  });

  it('all plans should have features', () => {
    for (const plan of DEFAULT_PLANS) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });
});
