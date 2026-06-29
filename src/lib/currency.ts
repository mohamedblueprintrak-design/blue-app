// @ts-check
/**
 * Multi-Currency Support
 * دعم العملات المتعددة
 * 
 * Provides currency formatting, conversion, and definitions
 * for the BluePrint engineering consultancy app.
 * Supports UAE and Gulf currencies with proper Arabic/English formatting.
 */

// ==================== Currency Definitions ====================

export interface CurrencyInfo {
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  AED: { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ', decimals: 2 },
  USD: { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', nameAr: 'يورو', symbol: '€', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', nameAr: 'جنيه إسترليني', symbol: '£', decimals: 2 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: 'ر.س', decimals: 2 },
  QAR: { code: 'QAR', name: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: 'ر.ق', decimals: 2 },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'د.ك', decimals: 3 },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', symbol: 'د.ب', decimals: 3 },
  OMR: { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني', symbol: 'ر.ع', decimals: 3 },
} as const;

export const CURRENCY_CODES = Object.keys(SUPPORTED_CURRENCIES) as string[];

// ==================== Default Exchange Rates (AED as base) ====================

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  AED: 1,
  USD: 0.2723,
  EUR: 0.2511,
  GBP: 0.2156,
  SAR: 1.0218,
  QAR: 0.9917,
  KWD: 0.0838,
  BHD: 0.1026,
  OMR: 0.1049,
};

// Note: Server-only exchange rate logic moved to currency-server.ts

// ==================== Formatting ====================

/**
 * Convert Arabic numerals (0-9) to Eastern Arabic numerals
 */
function toArabicNumerals(str: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d)]);
}

/**
 * Format a number as currency with proper symbol and decimals
 * 
 * @param amount - The amount to format
 * @param currency - Currency code (e.g., 'AED', 'USD')
 * @param language - 'ar' for Arabic, 'en' for English
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(100000, 'AED', 'en') // "AED 100,000.00"
 * formatCurrency(100000, 'AED', 'ar') // "١٠٠,٠٠٠.٠٠ د.إ"
 * formatCurrency(5000, 'USD', 'en')   // "$5,000.00"
 * formatCurrency(5000, 'KWD', 'ar')   // "٥,٠٠٠.٠٠٠ د.ك"
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  currency: string = 'AED',
  language: 'ar' | 'en' = 'en'
): string {
  // SECURITY FIX: Prisma Decimal is serialized as string in JSON.
  // Convert to Number before formatting to prevent type coercion bugs.
  const num = Number(amount) || 0;
  const info = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.AED;
  const decimals = info.decimals;
  
  if (language === 'ar') {
    // Format with Arabic locale and proper decimals
    const formatted = num.toLocaleString('ar-AE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${formatted} ${info.symbol}`;
  }
  
  // English formatting
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  
  // For some currencies, symbol comes before the amount
  if (['USD', 'EUR', 'GBP'].includes(currency)) {
    return `${info.symbol}${formatted}`;
  }
  
  return `${currency} ${formatted}`;
}

/**
 * Format a number as a compact currency string (e.g., "AED 1.5M")
 */
export function formatCurrencyCompact(
  amount: number | string | undefined | null,
  currency: string = 'AED',
  language: 'ar' | 'en' = 'en'
): string {
  const num = Number(amount) || 0;
  const info = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.AED;
  
  let compact: string;
  if (num >= 1000000) {
    compact = `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    compact = `${(num / 1000).toFixed(1)}K`;
  } else {
    compact = num.toFixed(info.decimals);
  }
  
  if (language === 'ar') {
    compact = toArabicNumerals(compact);
    return `${compact} ${info.symbol}`;
  }
  
  if (['USD', 'EUR', 'GBP'].includes(currency)) {
    return `${info.symbol}${compact}`;
  }
  
  return `${currency} ${compact}`;
}

// ==================== Conversion ====================

/**
 * Convert an amount from one currency to another using provided exchange rates.
 * 
 * Exchange rates are expressed as: 1 AED = X foreign currency
 * i.e., the rates are relative to AED as the base.
 * 
 * @param amount - Amount in source currency
 * @param from - Source currency code
 * @param to - Target currency code
 * @param rates - Exchange rates object (AED-base rates)
 * @returns Converted amount in target currency
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  if (from === to) return amount;
  
  const fromRate = rates[from] || DEFAULT_EXCHANGE_RATES[from] || 1;
  const toRate = rates[to] || DEFAULT_EXCHANGE_RATES[to] || 1;
  
  // Convert: amount in 'from' → AED → 'to'
  const aedAmount = amount / fromRate;
  return aedAmount * toRate;
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string, language: 'ar' | 'en' = 'en'): string {
  const info = SUPPORTED_CURRENCIES[currency];
  if (!info) return currency;
  return language === 'ar' ? info.symbol : info.code;
}

/**
 * Get currency name for a given currency code
 */
export function getCurrencyName(currency: string, language: 'ar' | 'en' = 'en'): string {
  const info = SUPPORTED_CURRENCIES[currency];
  if (!info) return currency;
  return language === 'ar' ? info.nameAr : info.name;
}

// Note: Server-only getCompanyCurrency logic moved to currency-server.ts
