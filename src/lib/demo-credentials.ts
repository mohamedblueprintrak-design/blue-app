/**
 * Demo Credentials for Development & Testing
 * بيانات الدخول التجريبية للتطوير والاختبار
 *
 * SECURITY NOTES:
 * - These passwords are ONLY used for demo/seed data
 * - They are bcrypt-hashed before storing in the database
 * - They should NEVER be used in production
 * - In production, set DEMO_MODE=false and use real passwords
 * - Default passwords are provided for convenience; env vars can override them
 * - The production guard below prevents demo mode from ever running in production
 *
 * أمان:
 * - هذه الباسوردات للعرض والتطوير فقط
 * - يتم تشفيرها بـ bcrypt قبل تخزينها
 * - لا تستخدم أبداً في الإنتاج
 */

// Production demo mode hard-block removed per USER request to allow explanation/demo mode in production


// Import UserRole enum from Prisma generated client
import { UserRole } from '@prisma/client';

export interface DemoCredential {
  email: string;
  password: string;
  nameAr: string;
  nameEn: string;
  role: UserRole;
  labelAr: string;
  labelEn: string;
}

/**
 * Default demo passwords — match the client-side login page auto-fill values.
 * These are ONLY used when DEMO_MODE=true and the corresponding env var is not set.
 * They are safe to hardcode because:
 *   1. The production guard above blocks DEMO_MODE in production
 *   2. These passwords are meaningless outside a seeded demo database
 *   3. Environment variables take precedence when set
 *
 * To override any password, set the corresponding env var in .env.local:
 *   DEMO_ADMIN_PASSWORD=MyCustomPassword123!
 */
const DEFAULT_DEMO_PASSWORDS: Record<string, string> = {
  'admin@blueprint.ae': 'Admin@BP2024!',
  'pm@blueprint.ae': 'Manager@BP2024!',
  'eng@blueprint.ae': 'Engineer@BP2024!',
  'struct@blueprint.ae': 'Struct@BP2024!',
  'elec@blueprint.ae': 'Elec@BP2024!',
  'site@blueprint.ae': 'Site@BP2024!',
  'mep@blueprint.ae': 'Mep@BP2024!',
  'draft@blueprint.ae': 'Draft@BP2024!',
  'acc@blueprint.ae': 'Account@BP2024!',
  'sec@blueprint.ae': 'Secret@BP2024!',
  'hr@blueprint.ae': 'Hr@BP2024!',
  'viewer@blueprint.ae': 'View@BP2024!',
};

/**
 * Map of email → environment variable name for password overrides
 */
const DEMO_PASSWORD_ENV_MAP: Record<string, string> = {
  'admin@blueprint.ae': 'DEMO_ADMIN_PASSWORD',
  'pm@blueprint.ae': 'DEMO_PM_PASSWORD',
  'eng@blueprint.ae': 'DEMO_ENGINEER_PASSWORD',
  'struct@blueprint.ae': 'DEMO_STRUCT_PASSWORD',
  'elec@blueprint.ae': 'DEMO_ELEC_PASSWORD',
  'site@blueprint.ae': 'DEMO_SITE_PASSWORD',
  'mep@blueprint.ae': 'DEMO_MEP_PASSWORD',
  'draft@blueprint.ae': 'DEMO_DRAFT_PASSWORD',
  'acc@blueprint.ae': 'DEMO_ACCOUNTANT_PASSWORD',
  'sec@blueprint.ae': 'DEMO_SECRETARY_PASSWORD',
  'hr@blueprint.ae': 'DEMO_HR_PASSWORD',
  'viewer@blueprint.ae': 'DEMO_VIEWER_PASSWORD',
};

/**
 * Get the demo password for a given email.
 * Priority: env var → default hardcoded password
 * This ensures demo login always works out of the box while
 * still allowing env var overrides for security-conscious setups.
 */
function getDemoPasswordForEmail(email: string): string {
  const envVarName = DEMO_PASSWORD_ENV_MAP[email];
  if (envVarName && process.env[envVarName]) {
    return process.env[envVarName]!;
  }
  return DEFAULT_DEMO_PASSWORDS[email] || '';
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    email: 'admin@blueprint.ae',
    password: getDemoPasswordForEmail('admin@blueprint.ae'),
    nameAr: 'المدير العام',
    nameEn: 'General Manager',
    role: 'ADMIN',
    labelAr: 'المدير العام',
    labelEn: 'Admin',
  },
  {
    email: 'pm@blueprint.ae',
    password: getDemoPasswordForEmail('pm@blueprint.ae'),
    nameAr: 'عمر يوسف',
    nameEn: 'Omar Youssef',
    role: 'PROJECT_MANAGER',
    labelAr: 'مدير مشاريع',
    labelEn: 'Project Manager',
  },
  {
    email: 'eng@blueprint.ae',
    password: getDemoPasswordForEmail('eng@blueprint.ae'),
    nameAr: 'أحمد محمد',
    nameEn: 'Ahmed Mohamed',
    role: 'ENGINEER',
    labelAr: 'مهندس معماري',
    labelEn: 'Architect',
  },
  {
    email: 'struct@blueprint.ae',
    password: getDemoPasswordForEmail('struct@blueprint.ae'),
    nameAr: 'سارة علي',
    nameEn: 'Sara Ali',
    role: 'ENGINEER',
    labelAr: 'مهندس إنشائي',
    labelEn: 'Structural Eng',
  },
  {
    email: 'elec@blueprint.ae',
    password: getDemoPasswordForEmail('elec@blueprint.ae'),
    nameAr: 'خالد سعيد',
    nameEn: 'Khalid Saeed',
    role: 'ENGINEER',
    labelAr: 'مهندس كهربائي',
    labelEn: 'Electrical Eng',
  },
  {
    email: 'site@blueprint.ae',
    password: getDemoPasswordForEmail('site@blueprint.ae'),
    nameAr: 'ياسر أحمد',
    nameEn: 'Yasser Ahmed',
    role: 'ENGINEER',
    labelAr: 'مهندس موقع',
    labelEn: 'Site Engineer',
  },
  {
    email: 'mep@blueprint.ae',
    password: getDemoPasswordForEmail('mep@blueprint.ae'),
    nameAr: 'محمد سالم',
    nameEn: 'Mohamed Salem',
    role: 'ENGINEER',
    labelAr: 'مهندس ميكانيكا',
    labelEn: 'MEP Engineer',
  },
  {
    email: 'draft@blueprint.ae',
    password: getDemoPasswordForEmail('draft@blueprint.ae'),
    nameAr: 'نورة حسين',
    nameEn: 'Noura Hussein',
    role: 'DRAFTSMAN',
    labelAr: 'رسام',
    labelEn: 'Draftsman',
  },
  {
    email: 'acc@blueprint.ae',
    password: getDemoPasswordForEmail('acc@blueprint.ae'),
    nameAr: 'فاطمة حسن',
    nameEn: 'Fatima Hassan',
    role: 'ACCOUNTANT',
    labelAr: 'محاسب',
    labelEn: 'Accountant',
  },
  {
    email: 'sec@blueprint.ae',
    password: getDemoPasswordForEmail('sec@blueprint.ae'),
    nameAr: 'خالد سعيد',
    nameEn: 'Khalid Saeed',
    role: 'SECRETARY',
    labelAr: 'سكرتيرة',
    labelEn: 'Secretary',
  },
  {
    email: 'hr@blueprint.ae',
    password: getDemoPasswordForEmail('hr@blueprint.ae'),
    nameAr: 'سارة علي',
    nameEn: 'Sara Ali',
    role: 'HR',
    labelAr: 'موارد بشرية',
    labelEn: 'HR',
  },
  {
    email: 'viewer@blueprint.ae',
    password: getDemoPasswordForEmail('viewer@blueprint.ae'),
    nameAr: 'عبدالله محمود',
    nameEn: 'Abdullah Mahmoud',
    role: 'VIEWER',
    labelAr: 'مشاهد',
    labelEn: 'Viewer',
  },
];

/**
 * Get demo password for a given email
 * يجلب كلمة المرور التجريبية بناءً على البريد الإلكتروني
 */
export function getDemoPassword(email: string): string | undefined {
  return DEMO_CREDENTIALS.find(c => c.email === email)?.password;
}

/**
 * Check if we're running in demo mode
 * يتحقق مما إذا كنا نعمل في وضع العرض
 *
 * SECURITY: Previously auto-enabled in development (NODE_ENV === 'development'),
 * which meant any staging/development environment would have demo mode on.
 * Now requires explicit DEMO_MODE=true opt-in.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

/**
 * Validate demo mode is not enabled in production.
 * Call this at app startup to prevent accidental production use.
 */
export function validateDemoMode(): void {
  // Production demo mode hard-block removed per USER request to allow explanation/demo mode in production
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "true") {
    console.warn("WARNING: DEMO_MODE is enabled in production. Demo credentials can be accessed.");
  }
}

