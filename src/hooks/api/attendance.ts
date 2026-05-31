/**
 * Attendance API hooks
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface AttendanceRecord {
  id: string;
  employeeId?: string;
  employeeName?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  notes?: string;
  createdAt?: Date | string;
}

const attendanceHooks = createCrudHooks<AttendanceRecord>({
  basePath: '/api/attendance',
  queryKey: 'attendance',
  invalidateKeys: [['dashboard']],
});

export const useAttendances = attendanceHooks.useAll;
export const useAttendance = attendanceHooks.useOne;
export const useCreateAttendance = attendanceHooks.useCreate;
export const useUpdateAttendance = attendanceHooks.useUpdate;
export const useDeleteAttendance = attendanceHooks.useDelete;
