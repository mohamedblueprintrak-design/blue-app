/**
 * Site Diary API hooks
 * Maps to /api/site-diary endpoint in Blue
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface SiteDiaryEntry {
  id: string;
  projectId?: string;
  projectName?: string;
  date?: Date | string;
  weather?: string;
  temperature?: number;
  workforce?: number;
  activities?: string;
  issues?: string;
  notes?: string;
  authorId?: string;
  authorName?: string;
  createdAt?: Date | string;
}

const siteDiaryHooks = createCrudHooks<SiteDiaryEntry>({
  basePath: '/api/site-diary',
  queryKey: 'site-diary',
  invalidateKeys: [['dashboard'], ['projects']],
});

export const useSiteReports = siteDiaryHooks.useAll;
export const useSiteReport = siteDiaryHooks.useOne;
export const useCreateSiteReport = siteDiaryHooks.useCreate;
export const useUpdateSiteReport = siteDiaryHooks.useUpdate;
export const useDeleteSiteReport = siteDiaryHooks.useDelete;
