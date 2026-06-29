/**
 * Client CRUD hooks
 * Routes: GET/POST /api/clients, GET/PUT/DELETE /api/clients/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const clientCrud = createCrudHooks<Client>({
  basePath: '/api/clients',
  queryKey: 'clients',
  invalidateKeys: [['dashboard'], ['projects'], ['invoices']],
});

export const useClients = clientCrud.useAll;
export const useClient = clientCrud.useOne;
export const useCreateClient = clientCrud.useCreate;
export const useUpdateClient = clientCrud.useUpdate;
export const useDeleteClient = clientCrud.useDelete;
