/**
 * Materials / Equipment API hooks
 * Maps to /api/equipment endpoint in Blue
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Material {
  id: string;
  name?: string;
  code?: string;
  category?: string;
  unit?: string;
  unitPrice?: number;
  quantityInStock?: number;
  minStockLevel?: number;
  supplierId?: string;
  supplierName?: string;
  description?: string;
  createdAt?: Date | string;
}

const materialHooks = createCrudHooks<Material>({
  basePath: '/api/equipment',
  queryKey: 'equipment',
  invalidateKeys: [['dashboard']],
});

export const useMaterials = materialHooks.useAll;
export const useMaterial = materialHooks.useOne;
export const useCreateMaterial = materialHooks.useCreate;
export const useUpdateMaterial = materialHooks.useUpdate;
export const useDeleteMaterial = materialHooks.useDelete;
