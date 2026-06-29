/**
 * Employee CRUD hooks
 * Routes: GET/POST /api/employees, GET/PUT/DELETE /api/employees/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Employee {
  id: string;
  userId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  hireDate?: Date | string;
  salary?: number;
  status?: string;
  avatar?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const employeeCrud = createCrudHooks<Employee>({
  basePath: '/api/employees',
  queryKey: 'employees',
  invalidateKeys: [['dashboard']],
});

export const useEmployees = employeeCrud.useAll;
export const useEmployee = employeeCrud.useOne;
export const useCreateEmployee = employeeCrud.useCreate;
export const useUpdateEmployee = employeeCrud.useUpdate;
export const useDeleteEmployee = employeeCrud.useDelete;
