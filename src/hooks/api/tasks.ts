/**
 * Task CRUD hooks
 * Routes: GET/POST /api/tasks, GET/PUT/DELETE /api/tasks/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

// ── Entity type ──────────────────────────────────────────────────────────────
// Extend / narrow this interface as Blue's Task schema evolves.

export interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  projectName?: string;
  assignedTo?: string;
  assigneeName?: string;
  dueDate?: Date | string;
  completedAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

const taskCrud = createCrudHooks<Task>({
  basePath: '/api/tasks',
  queryKey: 'tasks',
  invalidateKeys: [['dashboard']],
});

export const useTasks = taskCrud.useAll;
export const useTask = taskCrud.useOne;
export const useCreateTask = taskCrud.useCreate;
export const useUpdateTask = taskCrud.useUpdate;
export const useDeleteTask = taskCrud.useDelete;
