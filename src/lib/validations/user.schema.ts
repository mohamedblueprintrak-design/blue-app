import { z } from 'zod';

const safeNumber = z.coerce.number().optional().default(0);

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  department: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  // SECURITY: role is intentionally excluded from the update schema.
  // Role changes must go through a dedicated admin-only endpoint with explicit
  // validation against allowed roles to prevent privilege escalation.
  isActive: z.boolean().optional(),
  avatar: z.string().max(500).optional(),
});

export type UserUpdateData = z.infer<typeof userUpdateSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').max(200).optional(),
  email: z.string().email('بريد إلكتروني غير صحيح').optional(),
  phone: z.string().max(50).optional(),
  department: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

export const employeeCreateSchema = z.object({
  userId: z.string().min(1, 'المستخدم مطلوب'),
  department: z.string().max(200).optional().default(''),
  position: z.string().max(200).optional().default(''),
  salary: safeNumber,
  hireDate: z.string().optional().default(''),
  employmentStatus: z.string().max(50).optional().default('ACTIVE'),
});

export type EmployeeCreateData = z.infer<typeof employeeCreateSchema>;

export const employeeUpdateSchema = z.object({
  department: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  salary: z.coerce.number().optional(),
  employmentStatus: z.string().max(50).optional(),
  hireDate: z.string().optional(),
});

export type EmployeeUpdateData = z.infer<typeof employeeUpdateSchema>;

export const leaveCreateSchema = z.object({
  employeeId: z.string().min(1, 'الموظف مطلوب'),
  type: z.string().min(1).max(50),
  startDate: z.string().min(1, 'تاريخ البداية مطلوب'),
  endDate: z.string().min(1, 'تاريخ النهاية مطلوب'),
  reason: z.string().max(2000).optional().default(''),
  status: z.string().max(50).optional().default('PENDING'),
});

export type LeaveCreateData = z.infer<typeof leaveCreateSchema>;
