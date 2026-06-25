// ===== Shared Formatters =====
// Centralized formatting utilities to avoid duplication across 20+ page components.

import { formatCurrency as formatCurrencyMulti } from './currency';

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
export function formatDate(dateStr: string | undefined | null, ar: boolean, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString(
      ar ? "ar-AE" : "en-US",
      options ?? { year: "numeric", month: "short", day: "numeric" }
    );
  } catch {
    return dateStr;
  }
}
