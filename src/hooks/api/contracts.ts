/**
 * Contracts API hooks
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Contract {
  id: string;
  contractNumber?: string;
  projectId?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  title?: string;
  value?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: string;
  type?: string;
  description?: string;
  createdAt?: Date | string;
}

const contractHooks = createCrudHooks<Contract>({
  basePath: '/api/contracts',
  queryKey: 'contracts',
  invalidateKeys: [['dashboard'], ['projects'], ['clients']],
});

export const useContracts = contractHooks.useAll;
export const useContract = contractHooks.useOne;
export const useCreateContract = contractHooks.useCreate;
export const useUpdateContract = contractHooks.useUpdate;
export const useDeleteContract = contractHooks.useDelete;
