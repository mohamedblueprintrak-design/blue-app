/**
 * Dashboard Preset Service
 * خدمة قوالب لوحة المعلومات
 *
 * Manages role-specific dashboard presets with default widgets and KPIs.
 * Each role gets a predefined set of widgets relevant to their responsibilities.
 * Presets are stored in the database and can be customized per organization.
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import type { UserRole } from '@prisma/client';

// ============================================
// Types
// ============================================

export type WidgetType = 'chart' | 'stats' | 'list' | 'calendar' | 'progress' | 'alert';

export interface DashboardWidgetDef {
  id: string;
  type: WidgetType;
  title: string;
  titleEn: string;
  dataSource: string;
  position: number;
  size: 'small' | 'medium' | 'large' | 'full';
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area';
  refreshInterval?: number; // seconds
}

export interface RolePresetConfig {
  role: string;
  name: string;
  nameEn: string;
  widgets: DashboardWidgetDef[];
}

export interface CreatePresetInput {
  name: string;
  nameEn: string;
  role: string;
  isDefault?: boolean;
  layout?: string;
  widgets: string;
  organizationId?: string | null;
  createdById?: string | null;
}

export interface UpdatePresetInput {
  name?: string;
  nameEn?: string;
  isDefault?: boolean;
  layout?: string;
  widgets?: string;
}

// ============================================
// Role-specific Default Widget Definitions
// ============================================

const ROLE_DEFAULT_PRESETS: RolePresetConfig[] = [
  // ─── ADMIN ───────────────────────────────────────────────
  {
    role: 'ADMIN',
    name: 'نظرة عامة للمسؤول',
    nameEn: 'Admin Overview',
    widgets: [
      { id: 'admin-total-revenue', type: 'chart', title: 'إجمالي الإيرادات', titleEn: 'Total Revenue', dataSource: '/api/dashboard?metric=revenue', position: 1, size: 'large', chartType: 'area', refreshInterval: 300 },
      { id: 'admin-active-projects', type: 'stats', title: 'المشاريع النشطة', titleEn: 'Active Projects', dataSource: '/api/dashboard?metric=projects-overview', position: 2, size: 'medium', refreshInterval: 120 },
      { id: 'admin-pending-invoices', type: 'stats', title: 'الفواتير المعلقة', titleEn: 'Pending Invoices', dataSource: '/api/dashboard?metric=pending-invoices', position: 3, size: 'medium', refreshInterval: 120 },
      { id: 'admin-overdue-tasks', type: 'alert', title: 'المهام المتأخرة', titleEn: 'Overdue Tasks', dataSource: '/api/dashboard?metric=overdue-tasks', position: 4, size: 'small', refreshInterval: 60 },
      { id: 'admin-employee-count', type: 'stats', title: 'عدد الموظفين', titleEn: 'Employee Count', dataSource: '/api/dashboard?metric=employee-count', position: 5, size: 'small', refreshInterval: 600 },
      { id: 'admin-recent-activity', type: 'list', title: 'النشاط الأخير', titleEn: 'Recent Activity', dataSource: '/api/activity-log?limit=10', position: 6, size: 'medium', refreshInterval: 60 },
      { id: 'admin-cash-flow', type: 'chart', title: 'التدفق النقدي', titleEn: 'Cash Flow Chart', dataSource: '/api/dashboard?metric=cash-flow', position: 7, size: 'large', chartType: 'bar', refreshInterval: 300 },
      { id: 'admin-project-status', type: 'chart', title: 'حالة المشاريع', titleEn: 'Project Status Breakdown', dataSource: '/api/dashboard?metric=project-status', position: 8, size: 'medium', chartType: 'donut', refreshInterval: 300 },
    ],
  },

  // ─── MANAGER ─────────────────────────────────────────────
  {
    role: 'MANAGER',
    name: 'لوحة المدير',
    nameEn: 'Manager Dashboard',
    widgets: [
      { id: 'mgr-active-projects', type: 'stats', title: 'المشاريع النشطة', titleEn: 'Active Projects', dataSource: '/api/dashboard?metric=projects-overview', position: 1, size: 'full', refreshInterval: 120 },
      { id: 'mgr-overdue-tasks', type: 'alert', title: 'المهام المتأخرة', titleEn: 'Overdue Tasks', dataSource: '/api/dashboard?metric=overdue-tasks', position: 2, size: 'small', refreshInterval: 60 },
      { id: 'mgr-team-workload', type: 'chart', title: 'عبء الفريق', titleEn: 'Team Workload', dataSource: '/api/dashboard?metric=team-workload', position: 3, size: 'large', chartType: 'bar', refreshInterval: 300 },
      { id: 'mgr-upcoming-deadlines', type: 'calendar', title: 'المواعيد القادمة', titleEn: 'Upcoming Deadlines', dataSource: '/api/tasks?dueDate=upcoming&limit=10', position: 4, size: 'medium', refreshInterval: 300 },
      { id: 'mgr-budget-utilization', type: 'chart', title: 'استخدام الميزانية', titleEn: 'Budget Utilization', dataSource: '/api/dashboard?metric=budget-utilization', position: 5, size: 'medium', chartType: 'area', refreshInterval: 300 },
      { id: 'mgr-project-progress', type: 'progress', title: 'تقدم المشاريع', titleEn: 'Project Progress', dataSource: '/api/dashboard?metric=project-progress', position: 6, size: 'large', refreshInterval: 120 },
      { id: 'mgr-pending-approvals', type: 'list', title: 'الاعتمادات المعلقة', titleEn: 'Pending Approvals', dataSource: '/api/approvals/pending?limit=10', position: 7, size: 'medium', refreshInterval: 60 },
    ],
  },

  // ─── PROJECT_MANAGER ─────────────────────────────────────
  {
    role: 'PROJECT_MANAGER',
    name: 'لوحة مدير المشاريع',
    nameEn: 'Project Manager Dashboard',
    widgets: [
      { id: 'pm-my-projects', type: 'list', title: 'مشاريعي', titleEn: 'My Projects', dataSource: '/api/projects?managerId=me&limit=10', position: 1, size: 'medium', refreshInterval: 120 },
      { id: 'pm-tasks-overview', type: 'chart', title: 'نظرة على المهام', titleEn: 'Tasks Overview', dataSource: '/api/dashboard?metric=tasks-by-status', position: 2, size: 'medium', chartType: 'donut', refreshInterval: 120 },
      { id: 'pm-sla-warnings', type: 'alert', title: 'تحذيرات SLA', titleEn: 'SLA Warnings', dataSource: '/api/dashboard?metric=sla-warnings', position: 3, size: 'small', refreshInterval: 60 },
      { id: 'pm-municipality-status', type: 'progress', title: 'حالة البلدية', titleEn: 'Municipality Status', dataSource: '/api/dashboard?metric=municipality-status', position: 4, size: 'medium', refreshInterval: 300 },
      { id: 'pm-team-performance', type: 'chart', title: 'أداء الفريق', titleEn: 'Team Performance', dataSource: '/api/dashboard?metric=team-performance', position: 5, size: 'large', chartType: 'bar', refreshInterval: 300 },
      { id: 'pm-project-timeline', type: 'calendar', title: 'الجدول الزمني', titleEn: 'Project Timeline', dataSource: '/api/projects?timeline=true&limit=5', position: 6, size: 'large', refreshInterval: 300 },
    ],
  },

  // ─── ENGINEER ────────────────────────────────────────────
  {
    role: 'ENGINEER',
    name: 'لوحة المهندس',
    nameEn: 'Engineer Dashboard',
    widgets: [
      { id: 'eng-my-tasks', type: 'list', title: 'مهامي', titleEn: 'My Tasks', dataSource: '/api/tasks?assigneeId=me&status=todo,in_progress&limit=10', position: 1, size: 'medium', refreshInterval: 60 },
      { id: 'eng-sla-warnings', type: 'alert', title: 'تحذيرات SLA', titleEn: 'SLA Warnings', dataSource: '/api/dashboard?metric=sla-warnings', position: 2, size: 'small', refreshInterval: 60 },
      { id: 'eng-drawings-due', type: 'list', title: 'الرسوم المستحقة', titleEn: 'Drawings Due', dataSource: '/api/design-drawings?status=pending_review&limit=10', position: 3, size: 'medium', refreshInterval: 300 },
      { id: 'eng-review-queue', type: 'list', title: 'قائمة المراجعة', titleEn: 'Review Queue', dataSource: '/api/design-drawings?status=in_review&limit=10', position: 4, size: 'medium', refreshInterval: 120 },
      { id: 'eng-technical-issues', type: 'alert', title: 'المشاكل التقنية', titleEn: 'Technical Issues', dataSource: '/api/dashboard?metric=technical-issues', position: 5, size: 'small', refreshInterval: 120 },
      { id: 'eng-project-stages', type: 'progress', title: 'مراحل المشروع', titleEn: 'Project Stages', dataSource: '/api/dashboard?metric=project-stages', position: 6, size: 'large', refreshInterval: 300 },
    ],
  },

  // ─── DRAFTSMAN ───────────────────────────────────────────
  {
    role: 'DRAFTSMAN',
    name: 'لوحة رسام التصاميم',
    nameEn: 'Draftsman Dashboard',
    widgets: [
      { id: 'draft-drawing-tasks', type: 'list', title: 'مهام الرسم', titleEn: 'Drawing Tasks', dataSource: '/api/tasks?assigneeId=me&limit=10', position: 1, size: 'medium', refreshInterval: 60 },
      { id: 'draft-review-status', type: 'stats', title: 'حالة المراجعة', titleEn: 'Review Status', dataSource: '/api/design-drawings?status=in_review&limit=10', position: 2, size: 'small', refreshInterval: 120 },
      { id: 'draft-submission-queue', type: 'list', title: 'قائمة التقديم', titleEn: 'Submission Queue', dataSource: '/api/design-drawings?status=pending_submission&limit=10', position: 3, size: 'medium', refreshInterval: 120 },
      { id: 'draft-rejection-count', type: 'stats', title: 'عدد الرفض', titleEn: 'Rejection Count', dataSource: '/api/dashboard?metric=rejection-count', position: 4, size: 'small', refreshInterval: 300 },
      { id: 'draft-workload', type: 'chart', title: 'عبء العمل', titleEn: 'Workload', dataSource: '/api/dashboard?metric=workload', position: 5, size: 'medium', chartType: 'bar', refreshInterval: 300 },
    ],
  },

  // ─── ACCOUNTANT ──────────────────────────────────────────
  {
    role: 'ACCOUNTANT',
    name: 'لوحة المالية',
    nameEn: 'Finance Dashboard',
    widgets: [
      { id: 'fin-revenue', type: 'chart', title: 'الإيرادات', titleEn: 'Revenue', dataSource: '/api/dashboard?metric=revenue', position: 1, size: 'large', chartType: 'area', refreshInterval: 300 },
      { id: 'fin-pending-payments', type: 'stats', title: 'المدفوعات المعلقة', titleEn: 'Pending Payments', dataSource: '/api/dashboard?metric=pending-payments', position: 2, size: 'medium', refreshInterval: 120 },
      { id: 'fin-overdue-invoices', type: 'list', title: 'الفواتير المتأخرة', titleEn: 'Overdue Invoices', dataSource: '/api/invoices?status=overdue&limit=10', position: 3, size: 'medium', refreshInterval: 120 },
      { id: 'fin-vat-summary', type: 'stats', title: 'ملخص ضريبة القيمة المضافة', titleEn: 'VAT Summary', dataSource: '/api/dashboard?metric=vat-summary', position: 4, size: 'small', refreshInterval: 600 },
      { id: 'fin-cash-flow', type: 'chart', title: 'التدفق النقدي', titleEn: 'Cash Flow', dataSource: '/api/dashboard?metric=cash-flow', position: 5, size: 'large', chartType: 'bar', refreshInterval: 300 },
      { id: 'fin-budget-vs-actual', type: 'chart', title: 'الميزانية مقابل الفعلي', titleEn: 'Budget vs Actual', dataSource: '/api/dashboard?metric=budget-vs-actual', position: 6, size: 'medium', chartType: 'bar', refreshInterval: 300 },
      { id: 'fin-expense-categories', type: 'chart', title: 'فئات المصروفات', titleEn: 'Expense Categories', dataSource: '/api/dashboard?metric=expense-categories', position: 7, size: 'medium', chartType: 'donut', refreshInterval: 600 },
    ],
  },

  // ─── HR ──────────────────────────────────────────────────
  {
    role: 'HR',
    name: 'لوحة الموارد البشرية',
    nameEn: 'HR Dashboard',
    widgets: [
      { id: 'hr-employee-count', type: 'stats', title: 'عدد الموظفين', titleEn: 'Employee Count', dataSource: '/api/dashboard?metric=employee-count', position: 1, size: 'small', refreshInterval: 600 },
      { id: 'hr-leave-requests', type: 'list', title: 'طلبات الإجازة', titleEn: 'Leave Requests', dataSource: '/api/leave?status=pending&limit=10', position: 2, size: 'medium', refreshInterval: 60 },
      { id: 'hr-attendance', type: 'chart', title: 'الحضور', titleEn: 'Attendance', dataSource: '/api/dashboard?metric=attendance', position: 3, size: 'large', chartType: 'bar', refreshInterval: 300 },
      { id: 'hr-department-distribution', type: 'chart', title: 'توزيع الأقسام', titleEn: 'Department Distribution', dataSource: '/api/dashboard?metric=dept-distribution', position: 4, size: 'medium', chartType: 'donut', refreshInterval: 600 },
      { id: 'hr-hiring-pipeline', type: 'progress', title: 'خط التوظيف', titleEn: 'Hiring Pipeline', dataSource: '/api/dashboard?metric=hiring-pipeline', position: 5, size: 'medium', refreshInterval: 600 },
    ],
  },

  // ─── SECRETARY ───────────────────────────────────────────
  {
    role: 'SECRETARY',
    name: 'لوحة السكرتارية',
    nameEn: 'Secretary Dashboard',
    widgets: [
      { id: 'sec-document-queue', type: 'list', title: 'قائمة المستندات', titleEn: 'Document Queue', dataSource: '/api/documents?status=pending&limit=10', position: 1, size: 'medium', refreshInterval: 60 },
      { id: 'sec-expiring-licenses', type: 'alert', title: 'التراخيص المنتهية', titleEn: 'Expiring Licenses', dataSource: '/api/dashboard?metric=expiring-licenses', position: 2, size: 'small', refreshInterval: 300 },
      { id: 'sec-pending-correspondence', type: 'list', title: 'المراسلات المعلقة', titleEn: 'Pending Correspondence', dataSource: '/api/transmittals?status=pending&limit=10', position: 3, size: 'medium', refreshInterval: 120 },
      { id: 'sec-meeting-schedule', type: 'calendar', title: 'جدول الاجتماعات', titleEn: 'Meeting Schedule', dataSource: '/api/meetings?upcoming=true&limit=10', position: 4, size: 'large', refreshInterval: 300 },
      { id: 'sec-filing-tasks', type: 'list', title: 'مهام الأرشفة', titleEn: 'Filing Tasks', dataSource: '/api/tasks?type=filing&limit=10', position: 5, size: 'medium', refreshInterval: 120 },
    ],
  },

  // ─── VIEWER ──────────────────────────────────────────────
  {
    role: 'VIEWER',
    name: 'لوحة المشاهد',
    nameEn: 'Viewer Dashboard',
    widgets: [
      { id: 'viewer-project-overview', type: 'list', title: 'نظرة على المشاريع', titleEn: 'Project Overview', dataSource: '/api/projects?limit=10', position: 1, size: 'large', refreshInterval: 300 },
      { id: 'viewer-recent-activity', type: 'list', title: 'النشاط الأخير', titleEn: 'Recent Activity', dataSource: '/api/activity-log?limit=10', position: 2, size: 'medium', refreshInterval: 60 },
      { id: 'viewer-basic-stats', type: 'stats', title: 'إحصائيات أساسية', titleEn: 'Basic Stats', dataSource: '/api/dashboard?metric=overview', position: 3, size: 'small', refreshInterval: 600 },
    ],
  },
];

// ============================================
// Service Implementation
// ============================================

/**
 * Get the default preset configuration for a role (from static definitions)
 */
export function getRoleDefaultConfig(role: string): RolePresetConfig | undefined {
  return ROLE_DEFAULT_PRESETS.find(
    (p) => p.role.toUpperCase() === role.toUpperCase()
  );
}

/**
 * Get all available role names from presets
 */
export function getAvailableRoles(): string[] {
  return ROLE_DEFAULT_PRESETS.map((p) => p.role);
}

/**
 * Get the default preset for a role from the database.
 * Falls back to creating one from the static config if none exists.
 */
export async function getDefaultPreset(role: string, orgId: string | null) {
  const where: Record<string, unknown> = {
    role: role.toUpperCase() as UserRole,
    isDefault: true,
  };
  if (orgId) {
    where.organizationId = orgId;
  }

  const preset = await db.dashboardPreset.findFirst({ where });

  if (preset) {
    return {
      ...preset,
      widgets: JSON.parse(preset.widgets),
      layout: JSON.parse(preset.layout),
    };
  }

  // No default in DB — create one from the static config
  const config = getRoleDefaultConfig(role);
  if (!config) return null;

  const created = await db.dashboardPreset.create({
    data: {
      name: config.name,
      nameEn: config.nameEn,
      role: role.toUpperCase() as UserRole,
      isDefault: true,
      layout: JSON.stringify(config.widgets.map((w, i) => ({ widgetId: w.id, order: i }))),
      widgets: JSON.stringify(config.widgets),
      organizationId: orgId,
    },
  });

  return {
    ...created,
    widgets: JSON.parse(created.widgets),
    layout: JSON.parse(created.layout),
  };
}

/**
 * Initialize default presets for all roles in an organization.
 * Creates DB records from the static ROLE_DEFAULT_PRESETS.
 * Idempotent — skips if a default already exists for a role+org.
 */
export async function initializeDefaultPresets(orgId: string | null) {
  const created = [];

  for (const config of ROLE_DEFAULT_PRESETS) {
    const where: Record<string, unknown> = {
      role: config.role as UserRole,
      isDefault: true,
    };
    if (orgId) {
      where.organizationId = orgId;
    }

    const existing = await db.dashboardPreset.findFirst({ where });
    if (existing) {
      created.push({ ...existing, widgets: JSON.parse(existing.widgets), layout: JSON.parse(existing.layout), skipped: true });
      continue;
    }

    const preset = await db.dashboardPreset.create({
      data: {
        name: config.name,
        nameEn: config.nameEn,
        role: config.role as UserRole,
        isDefault: true,
        layout: JSON.stringify(config.widgets.map((w, i) => ({ widgetId: w.id, order: i }))),
        widgets: JSON.stringify(config.widgets),
        organizationId: orgId,
      },
    });

    created.push({ ...preset, widgets: JSON.parse(preset.widgets), layout: JSON.parse(preset.layout), skipped: false });
  }

  log.info(`[DashboardPresetService] Initialized ${created.filter(c => !c.skipped).length} presets, ${created.filter(c => c.skipped).length} already existed`);
  return created;
}

/**
 * List all presets for a role within an organization.
 */
export async function getPresetsByRole(role: string, orgId: string | null) {
  const where: Record<string, unknown> = {
    role: role.toUpperCase() as UserRole,
  };
  if (orgId) {
    where.organizationId = orgId;
  }

  const presets = await db.dashboardPreset.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return presets.map((p) => ({
    ...p,
    widgets: JSON.parse(p.widgets),
    layout: JSON.parse(p.layout),
  }));
}

/**
 * Create a custom preset.
 */
export async function createPreset(data: CreatePresetInput) {
  // If this preset is set as default, unset any existing default for the same role+org
  if (data.isDefault) {
    const where: Record<string, unknown> = {
      role: data.role.toUpperCase() as UserRole,
      isDefault: true,
    };
    if (data.organizationId) {
      where.organizationId = data.organizationId;
    }
    await db.dashboardPreset.updateMany({
      where,
      data: { isDefault: false },
    });
  }

  const preset = await db.dashboardPreset.create({
    data: {
      name: data.name,
      nameEn: data.nameEn,
      role: data.role.toUpperCase() as UserRole,
      isDefault: data.isDefault ?? false,
      layout: data.layout ?? '[]',
      widgets: data.widgets,
      organizationId: data.organizationId ?? null,
      createdById: data.createdById ?? null,
    },
  });

  log.info(`[DashboardPresetService] Created preset "${data.nameEn}" for role ${data.role}`);

  return {
    ...preset,
    widgets: JSON.parse(preset.widgets),
    layout: JSON.parse(preset.layout),
  };
}

/**
 * Update an existing preset.
 */
export async function updatePreset(id: string, data: UpdatePresetInput) {
  // If setting as default, unset any existing default for the same role+org
  if (data.isDefault) {
    const current = await db.dashboardPreset.findUnique({ where: { id } });
    if (current) {
      const where: Record<string, unknown> = {
        role: current.role,
        isDefault: true,
      };
      if (current.organizationId) {
        where.organizationId = current.organizationId;
      }
      await db.dashboardPreset.updateMany({
        where,
        data: { isDefault: false },
      });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
  if (data.layout !== undefined) updateData.layout = data.layout;
  if (data.widgets !== undefined) updateData.widgets = data.widgets;

  const preset = await db.dashboardPreset.update({
    where: { id },
    data: updateData,
  });

  log.info(`[DashboardPresetService] Updated preset ${id}`);

  return {
    ...preset,
    widgets: JSON.parse(preset.widgets),
    layout: JSON.parse(preset.layout),
  };
}

/**
 * Delete a preset by ID.
 */
export async function deletePreset(id: string) {
  const preset = await db.dashboardPreset.delete({
    where: { id },
  });

  log.info(`[DashboardPresetService] Deleted preset ${id} (${preset.nameEn})`);

  return {
    ...preset,
    widgets: JSON.parse(preset.widgets),
    layout: JSON.parse(preset.layout),
  };
}

/**
 * Get a single preset by ID.
 */
export async function getPresetById(id: string) {
  const preset = await db.dashboardPreset.findUnique({
    where: { id },
  });

  if (!preset) return null;

  return {
    ...preset,
    widgets: JSON.parse(preset.widgets),
    layout: JSON.parse(preset.layout),
  };
}
