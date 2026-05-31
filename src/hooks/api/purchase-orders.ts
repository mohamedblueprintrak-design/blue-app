/**
 * Purchase Orders API hooks
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface PurchaseOrderItem {
  id?: string;
  purchaseOrderId?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  total?: number;
  sortOrder?: number;
}

const purchaseOrderHooks = createCrudHooks<{
  id: string;
  poNumber?: string;
  supplierId?: string;
  supplierName?: string;
  projectId?: string;
  projectName?: string;
  orderDate?: Date | string;
  expectedDate?: Date | string;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  status?: string;
  notes?: string;
  terms?: string;
  items?: PurchaseOrderItem[];
  createdAt?: Date | string;
}>({
  basePath: '/api/purchase-orders',
  queryKey: 'purchase-orders',
  invalidateKeys: [['dashboard']],
});

export const usePurchaseOrders = purchaseOrderHooks.useAll;
export const usePurchaseOrder = purchaseOrderHooks.useOne;
export const useCreatePurchaseOrder = purchaseOrderHooks.useCreate;
export const useUpdatePurchaseOrder = purchaseOrderHooks.useUpdate;
export const useDeletePurchaseOrder = purchaseOrderHooks.useDelete;
