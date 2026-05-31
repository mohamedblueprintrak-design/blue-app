/**
 * Shared application constants.
 * Values read from environment variables with sensible defaults.
 */

/** UAE VAT tax rate (default 5%). Override via NEXT_PUBLIC_TAX_RATE env var. */
export const TAX_RATE: number =
  parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || '0.05');
