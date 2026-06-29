/**
 * Budgets API hooks
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface BudgetItem {
  id: string;
  projectId?: string;
  projectName?: string;
  category?: string;
  description?: string;
  budgetAmount?: number;
  actualAmount?: number;
  variance?: number;
  createdAt?: Date | string;
}

const budgetHooks = createCrudHooks<BudgetItem>({
  basePath: '/api/budgets',
  queryKey: 'budgets',
  invalidateKeys: [['dashboard'], ['projects']],
});

export const useBudgets = budgetHooks.useAll;
export const useBudget = budgetHooks.useOne;
export const useCreateBudget = budgetHooks.useCreate;
export const useUpdateBudget = budgetHooks.useUpdate;
export const useDeleteBudget = budgetHooks.useDelete;
