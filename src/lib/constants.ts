// Application constants — single source of truth

/**
 * UAE VAT rate as a FRACTION (0.05 = 5%) — for display math only (labels, UI chips).
 * ⚠️ CONVENTION: Invoice.taxRate in the DB and all service-layer APIs use PERCENT
 * (5.0 = 5%). Never pass VAT_RATE (0.05) as a taxRate argument — that would store
 * "0.05%" and undercharge tax by 100x. Use VAT_RATE_PERCENT for that.
 */
export const VAT_RATE = 0.05;

/** UAE VAT rate as PERCENT (5.0 = 5%) — the convention used by Invoice.taxRate DB column and services. */
export const VAT_RATE_PERCENT = 5.0;

/** Default currency */
export const DEFAULT_CURRENCY = 'AED';

/** Currency symbol (Arabic) */
export const CURRENCY_SYMBOL_AR = 'د.إ';

/** Currency symbol (English) */
export const CURRENCY_SYMBOL_EN = 'AED';

/** Format currency amount */
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return `${amount.toLocaleString()} ${currency}`;
}

/**
 * Format VAT amount — rate is a FRACTION (0.05 = 5%).
 * Fils-rounded to 2 decimals (ROUND_HALF_UP) to match the server-side
 * Prisma.Decimal rounding used by invoice.service.ts. Never store or print
 * an unrounded VAT amount on a tax invoice.
 */
export function calculateVat(subtotal: number, rate: number = VAT_RATE): number {
  return Math.round(subtotal * rate * 100) / 100;
}

/** VAT display label (Arabic) */
export const VAT_LABEL_AR = `الضريبة ${VAT_RATE * 100}%`;

/** VAT display label (English) */
export const VAT_LABEL_EN = `VAT (${VAT_RATE * 100}%)`;
