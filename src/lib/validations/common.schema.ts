/**
 * Common Validation Schemas — مخططات التحقق المشتركة
 *
 * Shared schemas and helpers used across multiple modules:
 * pagination, ID params, payment, and the safeNumber / createUpdateSchema utilities.
 */

import { z } from 'zod';

// ===== Helpers =====

/** Coerced number that defaults to 0 when omitted — رقم آمن يتحول من نص ويُفترض 0 */
export const safeNumber = z.coerce.number().optional().default(0);

/**
 * Generic update schema — allows partial updates with string values — مخطط تحديث عام — يسمح بالتحديث الجزئي
 */
export function createUpdateSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).partial();
}

// ===== Common Schemas =====

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().default(''),
  sortField: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationData = z.infer<typeof paginationSchema>;

export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format — must be a valid CUID'),
});

export type IdParamData = z.infer<typeof idParamSchema>;

// ===== Payment Schemas =====

export const paymentCreateSchema = z.object({
  voucherNumber: z.string().max(50).optional().default(''),
  projectId: z.string().cuid().optional(),
  amount: z.coerce.number().positive('المبلغ مطلوب ويجب أن يكون أكبر من صفر').max(999999999),
  payMethod: z.string().min(1, 'طريقة الدفع مطلوبة').max(50),
  beneficiary: z.string().max(300).optional().default(''),
  referenceNumber: z.string().max(100).optional().default(''),
  description: z.string().max(2000).optional().default(''),
});

export type PaymentCreateData = z.infer<typeof paymentCreateSchema>;

export const paymentUpdateSchema = z.object({
  status: z.string().max(50).optional(),
  // SECURITY: approvedById is intentionally excluded — auto-set server-side
  // when status transitions to 'APPROVED'. Allowing client-supplied approvedById
  // would enable self-approval or impersonation.
  amount: z.coerce.number().positive().max(999999999).optional(),
  payMethod: z.string().max(50).optional(),
  beneficiary: z.string().max(300).optional(),
  referenceNumber: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

export type PaymentUpdateData = z.infer<typeof paymentUpdateSchema>;
