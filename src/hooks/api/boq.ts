/**
 * BOQ (Bill of Quantities) API hooks
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface BOQItem {
  id: string;
  projectId?: string;
  itemNumber?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
  createdAt?: Date | string;
}

const boqHooks = createCrudHooks<BOQItem>({
  basePath: '/api/boq',
  queryKey: 'boq',
  invalidateKeys: [['dashboard'], ['projects']],
});

export const useBOQItems = boqHooks.useAll;
export const useBOQItem = boqHooks.useOne;
export const useCreateBOQItem = boqHooks.useCreate;
export const useUpdateBOQItem = boqHooks.useUpdate;
export const useDeleteBOQItem = boqHooks.useDelete;
