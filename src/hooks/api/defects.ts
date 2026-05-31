/**
 * Defect CRUD hooks
 * Routes: GET/POST /api/defects, GET/PUT/DELETE /api/defects/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Defect {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
  location?: string;
  imageId?: string;
  assignedTo?: string;
  resolvedAt?: Date | string;
  resolutionNotes?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const defectCrud = createCrudHooks<Defect>({
  basePath: '/api/defects',
  queryKey: 'defects',
});

export const useDefects = defectCrud.useAll;
export const useDefect = defectCrud.useOne;
export const useCreateDefect = defectCrud.useCreate;
export const useUpdateDefect = defectCrud.useUpdate;
export const useDeleteDefect = defectCrud.useDelete;
