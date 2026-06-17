import { describe, it, expect } from '@jest/globals';
import { invoiceUpdateSchema } from '@/lib/validations/update.schema';

describe('Payments Logic — Integration Tests', () => {
  describe('Invoice Validation', () => {
    it('should NOT allow paidAmount in client updates', () => {
      // The update schema for invoice should not have paidAmount
      const result = (invoiceUpdateSchema as { safeParse: (d: unknown) => { success: boolean, error?: unknown } }).safeParse({
        status: 'PAID',
        paidAmount: 5000, // This should be stripped or fail if strict
      });
      // In zod, if it's stripped, success is true but the output doesn't contain paidAmount
      if (result.success) {
        expect(result).not.toHaveProperty('data.paidAmount');
      } else {
        expect(result.success).toBe(false);
      }
    });

    it('should allow valid invoice updates without paidAmount', () => {
      const result = (invoiceUpdateSchema as { safeParse: (d: unknown) => { success: boolean } }).safeParse({
        status: 'SENT',
        dueDate: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });
  });
});
