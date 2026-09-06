/**
 * Tests for constants module
 * VAT calculations, currency formatting
 */

import { describe, it, expect } from '@jest/globals';

import {
  VAT_RATE,
  DEFAULT_CURRENCY,
  CURRENCY_SYMBOL_AR,
  CURRENCY_SYMBOL_EN,
  formatCurrency,
  calculateVat,
  VAT_LABEL_AR,
  VAT_LABEL_EN,
} from '@/lib/constants';

describe('VAT Constants', () => {
  it('VAT_RATE should be 0.05 (5%)', () => {
    expect(VAT_RATE).toBe(0.05);
  });

  it('DEFAULT_CURRENCY should be AED', () => {
    expect(DEFAULT_CURRENCY).toBe('AED');
  });

  it('CURRENCY_SYMBOL_AR should be Arabic dirham symbol', () => {
    expect(CURRENCY_SYMBOL_AR).toBe('د.إ');
  });

  it('CURRENCY_SYMBOL_EN should be AED', () => {
    expect(CURRENCY_SYMBOL_EN).toBe('AED');
  });

  it('VAT_LABEL_AR should contain Arabic tax label with 5%', () => {
    expect(VAT_LABEL_AR).toContain('5%');
  });

  it('VAT_LABEL_EN should contain English VAT label with 5%', () => {
    expect(VAT_LABEL_EN).toContain('5%');
  });
});

describe('formatCurrency', () => {
  it('should format amount with default AED currency', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('1,000');
    expect(result).toContain('AED');
  });

  it('should format with custom currency', () => {
    const result = formatCurrency(500, 'USD');
    expect(result).toContain('500');
  });

  it('should handle zero amount', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should handle large amounts', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1,000,000');
  });

  it('should handle decimal amounts', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1,234.56');
  });
});

describe('calculateVat', () => {
  it('should calculate 5% VAT on 1000', () => {
    expect(calculateVat(1000)).toBe(50);
  });

  it('should calculate 5% VAT on 0', () => {
    expect(calculateVat(0)).toBe(0);
  });

  it('should calculate VAT with custom rate', () => {
    expect(calculateVat(1000, 0.10)).toBe(100);
  });

  it('should handle decimal amounts (fils-rounded to 2dp)', () => {
    // 99.99 × 0.05 = 4.9995 — fils rounding (2dp, ROUND_HALF_UP) yields 5.00,
    // matching invoice.service.ts Prisma.Decimal rounding for tax invoices.
    expect(calculateVat(99.99)).toBe(5);
  });

  it('should handle negative amounts (returns/credits)', () => {
    expect(calculateVat(-1000)).toBe(-50);
  });
});
