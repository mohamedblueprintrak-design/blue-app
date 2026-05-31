/**
 * Project CRUD hooks
 * Routes: GET/POST /api/projects, GET/PUT/DELETE /api/projects/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  clientId?: string;
  clientName?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  budget?: number;
  progress?: number;
  managerId?: string;
  managerName?: string;
  location?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const projectCrud = createCrudHooks<Project>({
  basePath: '/api/projects',
  queryKey: 'projects',
  invalidateKeys: [['dashboard'], ['tasks'], ['invoices']],
});

export const useProjects = projectCrud.useAll;
export const useProject = projectCrud.useOne;
export const useCreateProject = projectCrud.useCreate;
export const useUpdateProject = projectCrud.useUpdate;
export const useDeleteProject = projectCrud.useDelete;
