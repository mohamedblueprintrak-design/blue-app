// ===== Shared Formatters =====
// Centralized formatting utilities to avoid duplication across 20+ page components.

/**
 * Format a number as AED currency
 */
export function formatCurrency(amount: number | undefined | null, ar: boolean): string {
  const num = amount ?? 0;
  return `${num.toLocaleString(ar ? "ar-AE" : "en-US")} ${ar ? "د.إ" : "AED"}`;
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
