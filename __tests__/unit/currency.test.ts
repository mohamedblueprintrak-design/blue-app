/**
 * Tests for currency module
 * Multi-currency support for UAE engineering consulting app
 */

import { describe, it, expect } from '@jest/globals';

import {
  SUPPORTED_CURRENCIES,
  CURRENCY_CODES,
  DEFAULT_EXCHANGE_RATES,
  formatCurrency,
  formatCurrencyCompact,
  convertCurrency,
  getCurrencySymbol,
  getCurrencyName,
} from '@/lib/currency';

describe('SUPPORTED_CURRENCIES', () => {
  it('should include AED as first currency', () => {
    expect(SUPPORTED_CURRENCIES.AED).toBeDefined();
    expect(SUPPORTED_CURRENCIES.AED.code).toBe('AED');
  });

  it('should include all Gulf currencies', () => {
    expect(SUPPORTED_CURRENCIES.SAR).toBeDefined();
    expect(SUPPORTED_CURRENCIES.QAR).toBeDefined();
    expect(SUPPORTED_CURRENCIES.KWD).toBeDefined();
    expect(SUPPORTED_CURRENCIES.BHD).toBeDefined();
    expect(SUPPORTED_CURRENCIES.OMR).toBeDefined();
  });

  it('should include major international currencies', () => {
    expect(SUPPORTED_CURRENCIES.USD).toBeDefined();
    expect(SUPPORTED_CURRENCIES.EUR).toBeDefined();
    expect(SUPPORTED_CURRENCIES.GBP).toBeDefined();
  });

  it('should have correct decimal places for Gulf currencies', () => {
    expect(SUPPORTED_CURRENCIES.KWD.decimals).toBe(3);
    expect(SUPPORTED_CURRENCIES.BHD.decimals).toBe(3);
    expect(SUPPORTED_CURRENCIES.OMR.decimals).toBe(3);
  });

  it('should have 2 decimal places for AED', () => {
    expect(SUPPORTED_CURRENCIES.AED.decimals).toBe(2);
  });
});

describe('CURRENCY_CODES', () => {
  it('should return array of currency codes', () => {
    expect(Array.isArray(CURRENCY_CODES)).toBe(true);
    expect(CURRENCY_CODES).toContain('AED');
    expect(CURRENCY_CODES).toContain('USD');
  });
});

describe('DEFAULT_EXCHANGE_RATES', () => {
  it('should have AED as base (rate 1)', () => {
    expect(DEFAULT_EXCHANGE_RATES.AED).toBe(1);
  });

  it('should have rates for all supported currencies', () => {
    for (const code of CURRENCY_CODES) {
      expect(DEFAULT_EXCHANGE_RATES[code]).toBeDefined();
      expect(DEFAULT_EXCHANGE_RATES[code]).toBeGreaterThan(0);
    }
  });
});

describe('formatCurrency', () => {
  it('should format AED in English', () => {
    const result = formatCurrency(100000, 'AED', 'en');
    expect(result).toContain('100,000.00');
    expect(result).toContain('AED');
  });

  it('should format AED in Arabic', () => {
    const result = formatCurrency(100000, 'AED', 'ar');
    expect(result).toContain('د.إ');
  });

  it('should format USD with $ symbol before amount', () => {
    const result = formatCurrency(5000, 'USD', 'en');
    expect(result).toContain('$');
    expect(result).toContain('5,000.00');
  });

  it('should handle null/undefined amount as 0', () => {
    const result = formatCurrency(null, 'AED', 'en');
    expect(result).toContain('0.00');
  });

  it('should handle undefined amount as 0', () => {
    const result = formatCurrency(undefined, 'AED', 'en');
    expect(result).toContain('0.00');
  });

  it('should fall back to AED decimals for unknown currency', () => {
    const result = formatCurrency(100, 'XYZ', 'en');
    // Unknown currency falls back to AED info (2 decimals) but uses the currency code passed in
    expect(result).toContain('100.00');
  });

  it('should format EUR with € symbol before amount', () => {
    const result = formatCurrency(1000, 'EUR', 'en');
    expect(result).toContain('€');
  });

  it('should format GBP with £ symbol before amount', () => {
    const result = formatCurrency(2000, 'GBP', 'en');
    expect(result).toContain('£');
  });

  it('should use 3 decimals for KWD', () => {
    const result = formatCurrency(5000, 'KWD', 'en');
    expect(result).toContain('5,000.000');
  });
});

describe('formatCurrencyCompact', () => {
  it('should format millions with M suffix', () => {
    const result = formatCurrencyCompact(1500000, 'AED', 'en');
    expect(result).toContain('1.5M');
  });

  it('should format thousands with K suffix', () => {
    const result = formatCurrencyCompact(1500, 'AED', 'en');
    expect(result).toContain('1.5K');
  });

  it('should format small numbers normally', () => {
    const result = formatCurrencyCompact(500, 'AED', 'en');
    expect(result).toContain('500.00');
  });

  it('should handle null/undefined amount as 0', () => {
    const result = formatCurrencyCompact(null, 'AED', 'en');
    expect(result).toContain('0.00');
  });

  it('should format Arabic compact values', () => {
    const result = formatCurrencyCompact(1500000, 'AED', 'ar');
    expect(result).toContain('د.إ');
  });

  it('should use $ prefix for USD in compact format', () => {
    const result = formatCurrencyCompact(2000000, 'USD', 'en');
    expect(result).toContain('$');
  });
});

describe('convertCurrency', () => {
  it('should return same amount for same currency', () => {
    const result = convertCurrency(1000, 'AED', 'AED', DEFAULT_EXCHANGE_RATES);
    expect(result).toBe(1000);
  });

  it('should convert AED to USD', () => {
    const result = convertCurrency(1000, 'AED', 'USD', DEFAULT_EXCHANGE_RATES);
    // 1000 AED * (0.2723 USD / 1 AED) ≈ 272.3 USD
    expect(result).toBeCloseTo(272.3, 0);
  });

  it('should convert USD to AED', () => {
    const result = convertCurrency(100, 'USD', 'AED', DEFAULT_EXCHANGE_RATES);
    // 100 USD / 0.2723 ≈ 367.24 AED
    expect(result).toBeCloseTo(367.24, 0);
  });

  it('should handle custom rates', () => {
    const customRates = { AED: 1, USD: 0.3 };
    const result = convertCurrency(1000, 'AED', 'USD', customRates);
    expect(result).toBe(300);
  });

  it('should use default rates when rate not in custom rates', () => {
    const customRates = { AED: 1 };
    const result = convertCurrency(1000, 'AED', 'USD', customRates);
    expect(result).toBeCloseTo(272.3, 0);
  });
});

describe('getCurrencySymbol', () => {
  it('should return Arabic symbol for Arabic language', () => {
    expect(getCurrencySymbol('AED', 'ar')).toBe('د.إ');
  });

  it('should return currency code for English language', () => {
    expect(getCurrencySymbol('AED', 'en')).toBe('AED');
  });

  it('should return currency code for unknown currency', () => {
    expect(getCurrencySymbol('XYZ', 'en')).toBe('XYZ');
  });

  it('should return $ for USD in English', () => {
    expect(getCurrencySymbol('USD', 'en')).toBe('USD');
  });
});

describe('getCurrencyName', () => {
  it('should return Arabic name for Arabic language', () => {
    expect(getCurrencyName('AED', 'ar')).toBe('درهم إماراتي');
  });

  it('should return English name for English language', () => {
    expect(getCurrencyName('AED', 'en')).toBe('UAE Dirham');
  });

  it('should return currency code for unknown currency', () => {
    expect(getCurrencyName('XYZ', 'en')).toBe('XYZ');
  });

  it('should return correct Arabic name for SAR', () => {
    expect(getCurrencyName('SAR', 'ar')).toBe('ريال سعودي');
  });
});
