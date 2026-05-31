/**
 * Payments / Expenses API hooks
 * Maps to /api/payments endpoint in Blue
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Payment {
  id: string;
  invoiceId?: string;
  projectId?: string;
  projectName?: string;
  amount?: number;
  paymentDate?: Date | string;
  method?: string;
  reference?: string;
  status?: string;
  notes?: string;
  createdAt?: Date | string;
}

const paymentHooks = createCrudHooks<Payment>({
  basePath: '/api/payments',
  queryKey: 'payments',
  invalidateKeys: [['dashboard'], ['invoices']],
});

export const usePayments = paymentHooks.useAll;
export const usePayment = paymentHooks.useOne;
export const useCreatePayment = paymentHooks.useCreate;
export const useUpdatePayment = paymentHooks.useUpdate;
export const useDeletePayment = paymentHooks.useDelete;
