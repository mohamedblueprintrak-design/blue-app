import { z } from 'zod';\n\nexport const loginSchema = z.object({
  email: z.string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z.string()
    .min(1, 'كلمة المرور مطلوبة')
    .max(128, 'كلمة المرور طويلة جداً'),
});\n\nexport type LoginData = z.infer<typeof loginSchema>;\n\nexport const registerSchema = z.object({
  email: z.string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً'),
  name: z.string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(100, 'الاسم طويل جداً')
    .optional()
    .default(''),
  fullName: z.string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(100, 'الاسم طويل جداً')
    .optional()
    .default(''),
  organizationName: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  // SECURITY: role is intentionally excluded — roles are assigned server-side only.
  // Allowing client-supplied role would enable privilege escalation.
  action: z.string().optional(),
});\n\nexport type RegisterData = z.infer<typeof registerSchema>;\n\nexport const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
});\n\nexport type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;\n\nexport const resetPasswordSchema = z.object({
  token: z.string().min(1, 'رمز إعادة التعيين مطلوب'),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً'),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  { message: 'كلمات المرور غير متطابقة', path: ['confirmPassword'] }
);\n\nexport type ResetPasswordData = z.infer<typeof resetPasswordSchema>;\n\nexport const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string()
    .min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً'),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => !data.confirmPassword || data.newPassword === data.confirmPassword,
  { message: 'كلمات المرور غير متطابقة', path: ['confirmPassword'] }
);\n\nexport type ChangePasswordData = z.infer<typeof changePasswordSchema>;\n\nexport const twoFactorSetupSchema = z.object({
  action: z.enum(['setup', 'enable'], {
    message: 'إجراء غير صحيح — يجب أن يكون setup أو enable',
  }),
  code: z.string()
    .regex(/^\d{6}$/, 'رمز التحقق يجب أن يكون 6 أرقام')
    .optional(),
}).refine(
  (data) => data.action !== 'enable' || !!data.code,
  { message: 'رمز التحقق مطلوب عند التفعيل', path: ['code'] }
);\n\nexport type TwoFactorSetupData = z.infer<typeof twoFactorSetupSchema>;\n\nexport const twoFactorDisableSchema = z.object({
  password: z.string()
    .min(1, 'كلمة المرور مطلوبة')
    .max(128, 'كلمة المرور طويلة جداً'),
});\n\nexport type TwoFactorDisableData = z.infer<typeof twoFactorDisableSchema>;\n\nexport const twoFactorVerifySchema = z.object({
  code: z.string()
    .min(1, 'الرمز مطلوب')
    .regex(/^\d{6}|\d{8}$/, 'صيغة الرمز غير صحيحة — يجب أن يكون 6 أرقام (TOTP) أو 8 أرقام (رمز احتياطي)')
    .max(8, 'الرمز طويل جداً'),
});\n\nexport type TwoFactorVerifyData = z.infer<typeof twoFactorVerifySchema>;\n\n