/**
 * Supplier CRUD hooks
 * Routes: GET/POST /api/suppliers, GET/PUT/DELETE /api/suppliers/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  taxId?: string;
  rating?: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const supplierCrud = createCrudHooks<Supplier>({
  basePath: '/api/suppliers',
  queryKey: 'suppliers',
});

export const useSuppliers = supplierCrud.useAll;
export const useSupplier = supplierCrud.useOne;
export const useCreateSupplier = supplierCrud.useCreate;
export const useUpdateSupplier = supplierCrud.useUpdate;
export const useDeleteSupplier = supplierCrud.useDelete;
