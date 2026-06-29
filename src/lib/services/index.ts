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
