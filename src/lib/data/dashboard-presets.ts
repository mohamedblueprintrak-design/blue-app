/**
 * Dashboard Presets by Role
 * قوالب لوحة المعلومات حسب الدور
 *
 * Predefined dashboard configurations for each role in the system.
 * Each preset defines widgets with type, title (EN + AR), data source,
 * position, and size for rendering the dashboard layout.
 */

// ============================================
// Types
// ============================================

export type WidgetType = 'chart' | 'stats' | 'list' | 'calendar' | 'progress' | 'alert';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  titleAr: string;
  dataSource: string;
  position: number;
  size: 'small' | 'medium' | 'large' | 'full';
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area';
  refreshInterval?: number; // seconds
}

export interface DashboardPreset {
  role: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  widgets: DashboardWidget[];
}

// ============================================
// Preset Definitions
// ============================================

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  // ─── ADMIN ───────────────────────────────────────────────
  {
    role: 'ADMIN',
    name: 'Admin Overview',
    nameAr: 'نظرة عامة للمسؤول',
    description: 'Full system overview with revenue, projects, and health metrics',
    descriptionAr: 'نظرة شاملة على النظام مع الإيرادات والمشاريع ومؤشرات الصحة',
    widgets: [
      { id: 'admin-revenue-chart', type: 'chart', title: 'Revenue Overview', titleAr: 'نظرة على الإيرادات', dataSource: '/api/dashboard?metric=revenue', position: 1, size: 'large', chartType: 'area', refreshInterval: 300 },
      { id: 'admin-overview-stats', type: 'stats', title: 'System Overview', titleAr: 'نظرة عامة على النظام', dataSource: '/api/dashboard?metric=overview', position: 2, size: 'full', refreshInterval: 60 },
      { id: 'admin-active-projects', type: 'list', title: 'Active Projects', titleAr: 'المشاريع النشطة', dataSource: '/api/projects?status=active&limit=5', position: 3, size: 'medium', refreshInterval: 120 },
      { id: 'admin-recent-activity', type: 'list', title: 'Recent Activity', titleAr: 'النشاط الأخير', dataSource: '/api/activity-log?limit=10', position: 4, size: 'medium', refreshInterval: 60 },
      { id: 'admin-system-health', type: 'stats', title: 'System Health', titleAr: 'صحة النظام', dataSource: '/api/health', position: 5, size: 'small', refreshInterval: 30 },
    ],
  },

  // ─── PROJECT_MANAGER ─────────────────────────────────────
  {
    role: 'PROJECT_MANAGER',
    name: 'Project Manager Dashboard',
    nameAr: 'لوحة مدير المشاريع',
    description: 'My projects, tasks by status, upcoming deadlines, and budget alerts',
    descriptionAr: 'مشاريعي، المهام حسب الحالة، المواعيد القادمة، وتنبيهات الميزانية',
    widgets: [
      { id: 'pm-my-projects', type: 'list', title: 'My Projects', titleAr: 'مشاريعي', dataSource: '/api/projects?managerId=me&limit=10', position: 1, size: 'medium', refreshInterval: 120 },
      { id: 'pm-tasks-status', type: 'chart', title: 'Tasks by Status', titleAr: 'المهام حسب الحالة', dataSource: '/api/dashboard?metric=tasks-by-status', position: 2, size: 'medium', chartType: 'donut', refreshInterval: 120 },
      { id: 'pm-upcoming-deadlines', type: 'calendar', title: 'Upcoming Deadlines', titleAr: 'المواعيد القادمة', dataSource: '/api/tasks?dueDate=upcoming&limit=10', position: 3, size: 'large', refreshInterval: 300 },
      { id: 'pm-budget-alerts', type: 'alert', title: 'Budget Alerts', titleAr: 'تنبيهات الميزانية', dataSource: '/api/dashboard?metric=budget-alerts', position: 4, size: 'small', refreshInterval: 300 },
    ],
  },

  // ─── ENGINEER ────────────────────────────────────────────
  {
    role: 'ENGINEER',
    name: 'Engineer Dashboard',
    nameAr: 'لوحة المهندس',
    description: 'Assigned tasks, drawings to review, site visits, and inspection reports',
    descriptionAr: 'المهام المسندة، الرسوم للمراجعة، الزيارات الميدانية، وتقارير التفتيش',
    widgets: [
      { id: 'eng-assigned-tasks', type: 'list', title: 'Assigned Tasks', titleAr: 'المهام المسندة لي', dataSource: '/api/tasks?assigneeId=me&status=todo,in_progress&limit=10', position: 1, size: 'medium', refreshInterval: 60 },
      { id: 'eng-drawings-review', type: 'list', title: 'Drawings to Review', titleAr: 'رسوم للمراجعة', dataSource: '/api/design-drawings?status=pending_review&limit=10', position: 2, size: 'medium', refreshInterval: 300 },
      { id: 'eng-site-visits', type: 'calendar', title: 'Site Visits', titleAr: 'الزيارات الميدانية', dataSource: '/api/site-visits?upcoming=true&limit=10', position: 3, size: 'large', refreshInterval: 300 },
      { id: 'eng-inspection-reports', type: 'list', title: 'Inspection Reports', titleAr: 'تقارير التفتيش', dataSource: '/api/inspections?limit=5', position: 4, size: 'small', refreshInterval: 600 },
    ],
  },

  // ─── ACCOUNTANT / FINANCE ────────────────────────────────
  {
    role: 'ACCOUNTANT',
    name: 'Finance Dashboard',
    nameAr: 'لوحة المالية',
    description: 'Revenue tracking, outstanding invoices, payment status, and expense categories',
    descriptionAr: 'تتبع الإيرادات، الفواتير المستحقة، حالة المدفوعات، وفئات المصروفات',
    widgets: [
      { id: 'fin-revenue', type: 'chart', title: 'Revenue', titleAr: 'الإيرادات', dataSource: '/api/dashboard?metric=revenue', position: 1, size: 'large', chartType: 'area', refreshInterval: 300 },
      { id: 'fin-outstanding-invoices', type: 'list', title: 'Outstanding Invoices', titleAr: 'الفواتير المستحقة', dataSource: '/api/invoices?status=sent,overdue&limit=10', position: 2, size: 'medium', refreshInterval: 120 },
      { id: 'fin-payment-status', type: 'chart', title: 'Payment Status', titleAr: 'حالة المدفوعات', dataSource: '/api/dashboard?metric=payment-status', position: 3, size: 'medium', chartType: 'pie', refreshInterval: 300 },
      { id: 'fin-expense-categories', type: 'chart', title: 'Expense Categories', titleAr: 'فئات المصروفات', dataSource: '/api/dashboard?metric=expense-categories', position: 4, size: 'small', chartType: 'donut', refreshInterval: 600 },
    ],
  },

  // ─── HR ──────────────────────────────────────────────────
  {
    role: 'HR',
    name: 'HR Dashboard',
    nameAr: 'لوحة الموارد البشرية',
    description: 'Employee count, leave requests, timesheets, and attendance',
    descriptionAr: 'عدد الموظفين، طلبات الإجازة، جداول الدوام، والحضور',
    widgets: [
      { id: 'hr-employee-count', type: 'stats', title: 'Employee Count', titleAr: 'عدد الموظفين', dataSource: '/api/dashboard?metric=employee-count', position: 1, size: 'small', refreshInterval: 600 },
      { id: 'hr-leave-requests', type: 'list', title: 'Leave Requests', titleAr: 'طلبات الإجازة', dataSource: '/api/leave?status=pending&limit=10', position: 2, size: 'medium', refreshInterval: 60 },
      { id: 'hr-timesheets', type: 'list', title: 'Timesheets', titleAr: 'جداول الدوام', dataSource: '/api/timesheets?status=pending&limit=10', position: 3, size: 'medium', refreshInterval: 120 },
      { id: 'hr-attendance', type: 'chart', title: 'Attendance', titleAr: 'الحضور', dataSource: '/api/dashboard?metric=attendance', position: 4, size: 'large', chartType: 'bar', refreshInterval: 300 },
    ],
  },

  // ─── MANAGER ─────────────────────────────────────────────
  {
    role: 'MANAGER',
    name: 'Manager Dashboard',
    nameAr: 'لوحة المدير',
    description: 'Project overview, team workload, financial summary, and approvals',
    descriptionAr: 'نظرة على المشاريع، عبء الفريق، الملخص المالي، والاعتمادات',
    widgets: [
      { id: 'mgr-projects-overview', type: 'stats', title: 'Projects Overview', titleAr: 'نظرة على المشاريع', dataSource: '/api/dashboard?metric=projects-overview', position: 1, size: 'full', refreshInterval: 120 },
      { id: 'mgr-team-workload', type: 'chart', title: 'Team Workload', titleAr: 'عبء الفريق', dataSource: '/api/dashboard?metric=team-workload', position: 2, size: 'large', chartType: 'bar', refreshInterval: 300 },
      { id: 'mgr-financial-summary', type: 'chart', title: 'Financial Summary', titleAr: 'الملخص المالي', dataSource: '/api/dashboard?metric=financial-summary', position: 3, size: 'medium', chartType: 'area', refreshInterval: 300 },
      { id: 'mgr-approvals', type: 'list', title: 'Pending Approvals', titleAr: 'الاعتمادات المعلقة', dataSource: '/api/approvals/pending?limit=10', position: 4, size: 'medium', refreshInterval: 60 },
    ],
  },

  // ─── DRAFTSMAN ───────────────────────────────────────────
  {
    role: 'DRAFTSMAN',
    name: 'Draftsman Dashboard',
    nameAr: 'لوحة رسام التصاميم',
    description: 'Drawing assignments, review queue, and project design phases',
    descriptionAr: 'تكليفات الرسم، قائمة المراجعة، ومراحل تصميم المشاريع',
    widgets: [
      { id: 'draft-assignments', type: 'list', title: 'My Assignments', titleAr: 'تكليفاتي', dataSource: '/api/tasks?assigneeId=me&limit=10', position: 1, size: 'medium', refreshInterval: 60 },
      { id: 'draft-review-queue', type: 'list', title: 'Review Queue', titleAr: 'قائمة المراجعة', dataSource: '/api/design-drawings?status=in_review&limit=10', position: 2, size: 'medium', refreshInterval: 120 },
      { id: 'draft-design-phases', type: 'progress', title: 'Design Phases', titleAr: 'مراحل التصميم', dataSource: '/api/design-phases?limit=5', position: 3, size: 'large', refreshInterval: 300 },
    ],
  },

  // ─── SECRETARY ───────────────────────────────────────────
  {
    role: 'SECRETARY',
    name: 'Secretary Dashboard',
    nameAr: 'لوحة السكرتارية',
    description: 'Documents, meetings, transmittals, and correspondence',
    descriptionAr: 'المستندات، الاجتماعات، الإرساليات، والمراسلات',
    widgets: [
      { id: 'sec-documents', type: 'list', title: 'Recent Documents', titleAr: 'المستندات الأخيرة', dataSource: '/api/documents?limit=10', position: 1, size: 'medium', refreshInterval: 60 },
      { id: 'sec-meetings', type: 'calendar', title: 'Upcoming Meetings', titleAr: 'الاجتماعات القادمة', dataSource: '/api/meetings?upcoming=true&limit=10', position: 2, size: 'large', refreshInterval: 300 },
      { id: 'sec-transmittals', type: 'list', title: 'Transmittals', titleAr: 'الإرساليات', dataSource: '/api/transmittals?limit=5', position: 3, size: 'medium', refreshInterval: 120 },
    ],
  },

  // ─── VIEWER ──────────────────────────────────────────────
  {
    role: 'VIEWER',
    name: 'Viewer Dashboard',
    nameAr: 'لوحة المشاهد',
    description: 'Read-only overview of projects and tasks',
    descriptionAr: 'نظرة عامة للقراءة فقط على المشاريع والمهام',
    widgets: [
      { id: 'viewer-projects', type: 'list', title: 'Projects', titleAr: 'المشاريع', dataSource: '/api/projects?limit=10', position: 1, size: 'large', refreshInterval: 300 },
      { id: 'viewer-tasks', type: 'list', title: 'Tasks', titleAr: 'المهام', dataSource: '/api/tasks?limit=10', position: 2, size: 'medium', refreshInterval: 120 },
      { id: 'viewer-overview', type: 'stats', title: 'Overview', titleAr: 'نظرة عامة', dataSource: '/api/dashboard?metric=overview', position: 3, size: 'small', refreshInterval: 600 },
    ],
  },
];

/**
 * Get a preset by role name (case-insensitive)
 */
export function getPresetByRole(role: string): DashboardPreset | undefined {
  return DASHBOARD_PRESETS.find(
    (preset) => preset.role.toUpperCase() === role.toUpperCase()
  );
}

/**
 * Get all available role names from presets
 */
export function getAvailableRoles(): string[] {
  return DASHBOARD_PRESETS.map((preset) => preset.role);
}
