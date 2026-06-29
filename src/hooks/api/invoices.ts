/**
 * Invoice CRUD hooks
 * Routes: GET/POST /api/invoices, GET/PUT/DELETE /api/invoices/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Invoice {
  id: string;
  invoiceNumber?: string;
  projectId?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  amount?: number;
  tax?: number;
  total?: number;
  status?: string;
  issueDate?: Date | string;
  dueDate?: Date | string;
  paidDate?: Date | string;
  notes?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const invoiceCrud = createCrudHooks<Invoice>({
  basePath: '/api/invoices',
  queryKey: 'invoices',
  invalidateKeys: [['dashboard'], ['projects']],
});

export const useInvoices = invoiceCrud.useAll;
export const useInvoice = invoiceCrud.useOne;
export const useCreateInvoice = invoiceCrud.useCreate;
export const useUpdateInvoice = invoiceCrud.useUpdate;
export const useDeleteInvoice = invoiceCrud.useDelete;
