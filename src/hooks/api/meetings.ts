/**
 * Meeting CRUD hooks
 * Routes: GET/POST /api/meetings, GET/PUT/DELETE /api/meetings/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  date?: Date | string;
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees?: string[];
  meetingLink?: string;
  status?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const meetingCrud = createCrudHooks<Meeting>({
  basePath: '/api/meetings',
  queryKey: 'meetings',
});

export const useMeetings = meetingCrud.useAll;
export const useMeeting = meetingCrud.useOne;
export const useCreateMeeting = meetingCrud.useCreate;
export const useUpdateMeeting = meetingCrud.useUpdate;
export const useDeleteMeeting = meetingCrud.useDelete;
