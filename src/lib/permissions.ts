export type Role =
  | "ADMIN"
  | "MANAGER"
  | "PROJECT_MANAGER"
  | "ENGINEER"
  | "DRAFTSMAN"
  | "ACCOUNTANT"
  | "HR"
  | "SECRETARY"
  | "VIEWER";

export interface NavItem {
  id: string;
  icon: string;
  labelAr: string;
  labelEn: string;
  roles: Role[];
  children?: NavItem[];
  href?: string;
}

export const roleLabelsAr: Record<Role, string> = {
  ADMIN: "مدير النظام",
  MANAGER: "المدير",
  PROJECT_MANAGER: "مدير مشاريع",
  ENGINEER: "مهندس",
  DRAFTSMAN: "مساح",
  ACCOUNTANT: "محاسب",
  HR: "موارد بشرية",
  SECRETARY: "سكرتارية",
  VIEWER: "مشاهد",
};

export const roleLabelsEn: Record<Role, string> = {
  ADMIN: "System Admin",
  MANAGER: "Manager",
  PROJECT_MANAGER: "Project Manager",
  ENGINEER: "Engineer",
  DRAFTSMAN: "Draftsman",
  ACCOUNTANT: "Accountant",
  HR: "HR",
  SECRETARY: "Secretary",
  VIEWER: "Viewer",
};

const allRoles: Role[] = [
  "ADMIN",
  "MANAGER",
  "PROJECT_MANAGER",
  "ENGINEER",
  "DRAFTSMAN",
  "ACCOUNTANT",
  "HR",
  "SECRETARY",
  "VIEWER",
];

const _managementRoles: Role[] = [
  "ADMIN",
  "MANAGER",
  "PROJECT_MANAGER",
];

const _fullRoles: Role[] = ["ADMIN", "MANAGER"];

// ===== NAVIGATION ITEMS (Simplified) =====
// Strategy: fewer top-level items, no unnecessary sub-menus.
// Pages handle their own tabs internally.
// Notifications → bell icon in header | AI Assistant → floating button | Settings → user dropdown
const allNavItems: NavItem[] = [
  // ───── 1. Dashboard ─────
  {
    id: "dashboard",
    icon: "LayoutDashboard",
    labelAr: "لوحة التحكم",
    labelEn: "Dashboard",
    roles: allRoles,
  },

  // ───── 2. Clients (صفحة واحدة بتابات داخلية) ─────
  {
    id: "clients",
    icon: "UserPlus",
    labelAr: "العملاء",
    labelEn: "Clients",
    roles: allRoles,
  },

  // ───── 3. Projects (صفحة واحدة بتابات داخلية + إنشاء جواها) ─────
  {
    id: "projects",
    icon: "FolderKanban",
    labelAr: "المشاريع",
    labelEn: "Projects",
    roles: allRoles,
  },

  // ───── 4. Contractors (صفحة واحدة بتابات: قائمة + إضافة + RFQs) ─────
  {
    id: "contractors",
    icon: "HardHat",
    labelAr: "المقاولون",
    labelEn: "Contractors",
    roles: ["ADMIN", "MANAGER", "PROJECT_MANAGER", "ENGINEER"],
  },

  // ───── 5. Finance (قائمة فرعية - الوحيدة المحتاجة sub-menu) ─────
  {
    id: "finance",
    icon: "Wallet",
    labelAr: "المالية",
    labelEn: "Finance",
    roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
    children: [
      {
        id: "finance-revenue",
        icon: "TrendingUp",
        labelAr: "الإيرادات",
        labelEn: "Revenue",
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      },
      {
        id: "finance-expenses",
        icon: "TrendingDown",
        labelAr: "المصروفات",
        labelEn: "Expenses",
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      },
      {
        id: "finance-reports",
        icon: "BarChart3",
        labelAr: "التقارير",
        labelEn: "Reports",
        roles: ["ADMIN", "MANAGER", "PROJECT_MANAGER", "ACCOUNTANT"],
      },
      {
        id: "finance-retainage",
        icon: "Shield",
        labelAr: "الاحتجاز",
        labelEn: "Retainage",
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      },
      {
        id: "finance-guarantees",
        icon: "Shield",
        labelAr: "خطابات الضمان",
        labelEn: "Guarantees",
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      },
      {
        id: "finance-progress-claims",
        icon: "ClipboardCheck",
        labelAr: "مطالبات التقدم",
        labelEn: "Progress Claims",
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT", "PROJECT_MANAGER"],
      },
    ],
  },

  // ───── 6. Employees (صفحة واحدة بتابات: قائمة + حضور + إجازات + أعباء) ─────
  {
    id: "employees",
    icon: "UsersRound",
    labelAr: "الموظفين",
    labelEn: "Employees",
    roles: ["ADMIN", "MANAGER", "HR"],
  },

  // ───── 7. Help & AI (المساعدة والذكاء الاصطناعي) ─────
  {
    id: "help",
    icon: "Headphones",
    labelAr: "المساعدة",
    labelEn: "Help & AI",
    roles: allRoles,
    children: [
      {
        id: "ai-assistant",
        icon: "Sparkles",
        labelAr: "المساعد الذكي",
        labelEn: "AI Assistant",
        roles: allRoles,
      },
      {
        id: "knowledge",
        icon: "BookMarked",
        labelAr: "قاعدة المعرفة",
        labelEn: "Knowledge Base",
        roles: allRoles,
      },
      {
        id: "calendar",
        icon: "Calendar",
        labelAr: "التقويم",
        labelEn: "Calendar",
        roles: allRoles,
      },
      {
        id: "search",
        icon: "Search",
        labelAr: "البحث",
        labelEn: "Search",
        roles: allRoles,
      },
      {
        id: "api-docs",
        icon: "BookOpen",
        labelAr: "توثيق API",
        labelEn: "API Docs",
        roles: allRoles,
        href: "/docs",
      },
    ],
  },

  // ───── 8. Advanced Features (المميزات المتقدمة) ─────
  {
    id: "features-hub",
    icon: "Sparkles",
    labelAr: "المميزات المتقدمة",
    labelEn: "Advanced Features",
    roles: allRoles,
  },

  // ───── 7. System Admin (admin بس) ─────
  {
    id: "admin",
    icon: "Shield",
    labelAr: "إدارة النظام",
    labelEn: "System Admin",
    roles: ["ADMIN"],
  },
];

// ===== ROLE NORMALIZATION =====
/**
 * Normalize client-side role (lowercase from JWT) to UPPERCASE format
 * used by permissions and navigation.
 * Delegates to @/lib/auth/modules/authorization.ts — canonical implementation.
 */
export { normalizeRole } from '@/lib/auth/modules/authorization';
import { normalizeRole } from '@/lib/auth/modules/authorization';

// ===== FILTER NAVIGATION BY ROLE =====
function filterNavItemsByRole(items: NavItem[], role: Role): NavItem[] {
  return items
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children
        ? filterNavItemsByRole(item.children, role)
        : undefined,
    }))
    .filter((item) => {
      if (!item.children || item.children.length === 0) {
        return true;
      }
      return item.children.length > 0;
    });
}

export function getNavItems(role: string): NavItem[] {
  return filterNavItemsByRole(allNavItems, normalizeRole(role) as Role);
}

// ===== CHECK PERMISSION HELPER =====
export function hasPagePermission(role: string, pageId: string): boolean {
  const items = getNavItems(role);
  return checkItemAccess(items, pageId);
}

function checkItemAccess(items: NavItem[], pageId: string): boolean {
  for (const item of items) {
    if (item.id === pageId) return true;
    if (item.children && checkItemAccess(item.children, pageId)) return true;
  }
  return false;
}

// ===== PROJECT TAB ITEMS =====
export const projectTabItems = [
  { id: "overview", icon: "Eye", labelAr: "نظرة عامة", labelEn: "Overview" },
  { id: "design-stage", icon: "PenTool", labelAr: "مرحلة التصميم", labelEn: "Design Stage" },
  { id: "municipality", icon: "Landmark", labelAr: "البلدية", labelEn: "Municipality" },
  { id: "boq-specs", icon: "Calculator", labelAr: "مقاييس ومواصفات", labelEn: "BOQ & Specs" },
  { id: "contractor-assignment", icon: "HardHat", labelAr: "تعيين مقاول", labelEn: "Contractor Assignment" },
  { id: "supervision", icon: "ClipboardCheck", labelAr: "الإشراف", labelEn: "Supervision" },
  { id: "tasks", icon: "ListTodo", labelAr: "المهام", labelEn: "Tasks" },
  { id: "FINANCIAL", icon: "Wallet", labelAr: "المالية", labelEn: "Financial" },
  { id: "documents", icon: "FileText", labelAr: "المستندات", labelEn: "Documents" },
  { id: "workflow", icon: "GitBranch", labelAr: "سير العمل", labelEn: "Workflow" },
];

// Design Stage Sub-tabs
export const designSubTabs = [
  { id: "ARCHITECTURAL", icon: "Building2", labelAr: "المعماري", labelEn: "Architectural" },
  { id: "STRUCTURAL", icon: "HardHat", labelAr: "الإنشائي", labelEn: "Structural" },
  { id: "mep-electrical", icon: "Zap", labelAr: "الكهرباء", labelEn: "Electrical" },
  { id: "mep-plumbing", icon: "Droplets", labelAr: "السباكة", labelEn: "Plumbing" },
  { id: "mep-hvac", icon: "Wind", labelAr: "التكييف", labelEn: "HVAC" },
  { id: "civil-defense", icon: "Shield", labelAr: "الدفاع المدني", labelEn: "Civil Defense" },
];

// Technical Sub-tabs
export const technicalSubTabs = [
  { id: "ARCHITECTURAL", icon: "Building2", labelAr: "المعماري", labelEn: "Architectural" },
  { id: "STRUCTURAL", icon: "HardHat", labelAr: "الإنشائي", labelEn: "Structural" },
  { id: "ELECTRICAL", icon: "Zap", labelAr: "الكهربائي", labelEn: "Electrical" },
  { id: "PLUMBING", icon: "Droplets", labelAr: "السباكة", labelEn: "Plumbing" },
  { id: "gov-approvals", icon: "Landmark", labelAr: "الموافقات الحكومية", labelEn: "Gov Approvals" },
  { id: "boq", icon: "Calculator", labelAr: "جدول الكميات", labelEn: "BOQ" },
  { id: "change-orders", icon: "FileEdit", labelAr: "أوامر التغيير", labelEn: "Change Orders" },
  { id: "risks", icon: "ShieldAlert", labelAr: "المخاطر", labelEn: "Risks" },
];

// Documents Sub-tabs
export const documentsSubTabs = [
  { id: "contract", icon: "FileSignature", labelAr: "العقد", labelEn: "Contract" },
  { id: "documents", icon: "FileText", labelAr: "المستندات", labelEn: "Documents" },
  { id: "municipality", icon: "Landmark", labelAr: "المراسلات البلدية", labelEn: "Municipality" },
];

// Financial Sub-tabs
export const financialSubTabs = [
  { id: "invoices", icon: "Receipt", labelAr: "الفواتير", labelEn: "Invoices" },
  { id: "payments", icon: "CreditCard", labelAr: "المدفوعات", labelEn: "Payments" },
  { id: "budgets", icon: "PiggyBank", labelAr: "الميزانية", labelEn: "Budget" },
  { id: "proposals", icon: "FileSpreadsheet", labelAr: "العروض", labelEn: "Proposals" },
  { id: "bids", icon: "Gavel", labelAr: "العطاءات", labelEn: "Bids" },
];

// Site Sub-tabs
export const siteSubTabs = [
  { id: "clients", icon: "Users", labelAr: "العملاء", labelEn: "Clients" },
  { id: "site-visits", icon: "Eye", labelAr: "زيارات الموقع", labelEn: "Site Visits" },
  { id: "site-diary", icon: "BookOpen", labelAr: "يومية الموقع", labelEn: "Site Diary" },
  { id: "rfi", icon: "MessageSquareQuote", labelAr: "طلبات المعلومات", labelEn: "RFI" },
  { id: "defects", icon: "AlertTriangle", labelAr: "العيوب", labelEn: "Defects" },
];

// Team Sub-tabs
export const teamSubTabs = [
  { id: "team-members", icon: "UsersRound", labelAr: "الفريق", labelEn: "Team" },
  { id: "meetings", icon: "Video", labelAr: "الاجتماعات", labelEn: "Meetings" },
  { id: "approvals", icon: "ClipboardCheck", labelAr: "الموافقات", labelEn: "Approvals" },
  { id: "notifications", icon: "Bell", labelAr: "الإشعارات", labelEn: "Notifications" },
  { id: "activity-log", icon: "Activity", labelAr: "سجل النشاط", labelEn: "Activity Log" },
];

// Help Sub-tabs
export const helpSubTabs = [
  { id: "ai-assistant", icon: "Sparkles", labelAr: "المساعد الذكي", labelEn: "AI Assistant" },
  { id: "knowledge", icon: "BookMarked", labelAr: "قاعدة المعرفة", labelEn: "Knowledge" },
  { id: "calendar", icon: "Calendar", labelAr: "التقويم", labelEn: "Calendar" },
  { id: "search", icon: "Search", labelAr: "البحث", labelEn: "Search" },
];
