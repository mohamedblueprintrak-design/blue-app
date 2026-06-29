/**
 * Risk CRUD hooks
 * Routes: GET/POST /api/risks, GET/PUT/DELETE /api/risks/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Risk {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  category?: string;
  probability?: 'low' | 'medium' | 'high' | 'critical';
  impact?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
  mitigationPlan?: string;
  assignedTo?: string;
  dueDate?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const riskCrud = createCrudHooks<Risk>({
  basePath: '/api/risks',
  queryKey: 'risks',
});

export const useRisks = riskCrud.useAll;
export const useRisk = riskCrud.useOne;
export const useCreateRisk = riskCrud.useCreate;
export const useUpdateRisk = riskCrud.useUpdate;
export const useDeleteRisk = riskCrud.useDelete;
