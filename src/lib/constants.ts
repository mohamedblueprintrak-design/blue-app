// Application constants — single source of truth

/** UAE VAT rate (5%) */
export const VAT_RATE = 0.05;

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

/** Format VAT amount */
export function calculateVat(subtotal: number, rate: number = VAT_RATE): number {
  return subtotal * rate;
}

/** VAT display label (Arabic) */
export const VAT_LABEL_AR = `الضريبة ${VAT_RATE * 100}%`;

/** VAT display label (English) */
export const VAT_LABEL_EN = `VAT (${VAT_RATE * 100}%)`;
