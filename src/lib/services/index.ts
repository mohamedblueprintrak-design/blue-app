// @ts-check
/**
 * Services Index
 * تصدير الخدمات
 * 
 * Centralized exports for all business logic services
 */

// Audit Service
export { 
  logAudit, 
  type AuditLogParams 
} from './audit.service';

// Project Service
export { 
  projectService, 
  type ProjectStats, 
  type ProjectFilters, 
  type PaginationParams, 
  type PaginatedResult,
  type CreateProjectInput
} from './project.service';

// Client Service
export { 
  clientService, 
  type ClientStats, 
  type ClientWithProjects,
  type CreateClientInput,
  type UpdateClientInput,
  type ActiveClientDTO,
  ClientAccessError
} from './client.service';

// Task Service
export { 
  taskService, 
  type TaskFilters, 
  type TaskPaginationParams,
  type TaskPaginatedResult,
  type CreateTaskInput
} from './task.service';

// Invoice Service
export { 
  invoiceService, 
  type InvoiceFilters, 
  type InvoicePaginationParams,
  type InvoicePaginatedResult,
  type CreateInvoiceInput,
  type InvoiceStats
} from './invoice.service';

// ============================================
// NEW: SLA Monitoring Service
// خدمة مراقبة SLA
// ============================================
export {
  checkSLABreaches,
  getSLAStatistics,
  resolveSLABreach,
  type SLACheckResult,
  type SLAMonitorReport
} from './sla-monitor.service';

// ============================================
// NEW: Project Template Service
// خدمة قوالب المشاريع
// ============================================
export {
  initializeTemplates,
  createTasksFromTemplate,
  getAvailableTemplates,
  getTemplateDetails,
  PREDEFINED_TEMPLATES,
  type CreateProjectFromTemplateInput,
  type TemplateTaskData
} from './project-template.service';

// ============================================
// NEW: Notification Service
// خدمة الإشعارات الموحدة
// ============================================
export {
  notificationService,
  type NotificationType,
  type CreateNotificationInput,
  type NotificationChannel,
  type NotificationChannelConfig,
} from './notification.service';

// ============================================
// NEW: WhatsApp Business API Service
// خدمة واتساب للأعمال
// ============================================
export {
  whatsappService,
  type WhatsAppSendResult,
  type TemplateComponent,
  type TemplateParameter,
  type InvoiceNotificationData,
  type ProjectUpdateData,
  type MessageStatusResult,
  type WhatsAppTemplate,
} from './whatsapp.service';

// ============================================
// NEW: Milestone Service
// خدمة مراحل الدفع
// ============================================
export {
  milestoneService,
  type MilestoneStatus,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
  type MilestoneSummary,
} from './milestone.service';

// ============================================
// NEW: Report Builder Service
// خدمة منشئ التقارير المخصصة
// ============================================
export {
  executeReport,
  formatAsCSV,
  formatAsPDF,
  getDataSourceMetadata,
  getDataSourceFields,
  getFilterOperators,
  validateReportDefinition,
  type DataSourceName,
  type AggregationType,
  type FilterOperator,
  type ChartType,
  type OutputFormat,
  type SortOrder,
  type ReportField,
  type ReportFilter,
  type ReportDefinition,
  type ReportResult,
} from './report-builder.service';

// ============================================
// NEW: Dashboard Preset Service
// خدمة قوالب لوحة المعلومات
// ============================================
export {
  getDefaultPreset,
  initializeDefaultPresets,
  getPresetsByRole,
  createPreset,
  updatePreset,
  deletePreset,
  getPresetById,
  getRoleDefaultConfig,
  getAvailableRoles,
  type WidgetType,
  type DashboardWidgetDef,
  type RolePresetConfig,
  type CreatePresetInput,
  type UpdatePresetInput,
} from './dashboard-preset.service';
