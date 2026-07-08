// ===== Shared Formatters =====
// Centralized formatting utilities to avoid duplication across 20+ page components.

import { formatCurrency as formatCurrencyMulti } from './currency';
import { formatToHijri } from './hijri-utils';

/**
 * Format a number as AED currency (backward-compatible)
 * SECURITY FIX: Prisma Decimal fields are serialized as strings in JSON.
 * This function accepts string|number and safely converts to Number before
 * formatting. Without this, string concatenation or type coercion produces
 * garbage values (e.g. "66250" + "66250" = "6625066250" instead of 132500).
 */
export function formatCurrency(amount: number | string | undefined | null, ar: boolean): string {
  const num = Number(amount) || 0;
  return `${num.toLocaleString(ar ? "ar-AE" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ar ? "د.إ" : "AED"}`;
}

/**
 * Format a number with multi-currency support
 * Uses the currency.ts utility for proper symbol and decimal handling
 */
export function formatCurrencyWithCode(
  amount: number | undefined | null,
  currency: string = 'AED',
  language: 'ar' | 'en' = 'ar'
): string {
  return formatCurrencyMulti(amount, currency, language);
}

/**
 * Compact number formatting (e.g. 1500000 → 1.5M)
 */
export function formatK(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
}

/**
 * Format percentage with sign
 */
export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/**
 * Format a date string for display
 */
/**
 * Format a date string with optional Hijri (Islamic) calendar display.
 * In Arabic mode, shows both Gregorian and Hijri dates.
 * In English mode, shows Gregorian only (with optional Hijri in parentheses).
 *
 * @param dateStr - ISO date string or null
 * @param ar - Arabic mode flag
 * @param options - Intl.DateTimeFormatOptions for custom formatting
 * @param showHijri - If true, appends Hijri date (default: true in Arabic mode)
 */
export function formatDate(
  dateStr: string | undefined | null,
  ar: boolean,
  options?: Intl.DateTimeFormatOptions,
  showHijri?: boolean
): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    const gregorian = date.toLocaleDateString(
      ar ? "ar-AE" : "en-US",
      options ?? { year: "numeric", month: "short", day: "numeric" }
    );

    // Determine if Hijri should be shown
    const shouldShowHijri = showHijri ?? ar; // Default: show in Arabic mode only

    if (shouldShowHijri) {
      try {
        const hijri = formatToHijri(date, { day: 'numeric', month: 'short', year: 'numeric', locale: ar ? 'ar' : 'en' });
        return ar
          ? `${gregorian} (${hijri} هـ)`
          : `${gregorian} (AH ${hijri})`;
      } catch {
        return gregorian;
      }
    }

    return gregorian;
  } catch {
    return dateStr;
  }
}
