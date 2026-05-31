/**
 * Users API hooks
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface AdminUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  position?: string;
  avatar?: string;
  isActive?: boolean;
  organizationId?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: Date | string;
}

const userHooks = createCrudHooks<AdminUser>({
  basePath: '/api/users',
  queryKey: 'users',
  invalidateKeys: [['dashboard']],
});

export const useUsers = userHooks.useAll;
export const useUser = userHooks.useOne;
export const useCreateUser = userHooks.useCreate;
export const useUpdateUser = userHooks.useUpdate;
export const useDeleteUser = userHooks.useDelete;
