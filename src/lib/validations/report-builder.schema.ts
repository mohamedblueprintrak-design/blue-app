/**
 * Report Builder Validation Schemas — مخططات التحقق من منشئ التقارير
 *
 * Zod schemas for the Custom Report Builder feature.
 * Covers template CRUD, field selection, filters, execution, and export.
 */

import { z } from 'zod';

// ============================================
// Constants
// ============================================

export const VALID_DATA_SOURCES = [
  'projects', 'invoices', 'tasks', 'clients', 'employees',
  'payments', 'contracts', 'timesheets', 'expenses', 'commissions',
] as const;

export type DataSourceName = typeof VALID_DATA_SOURCES[number];

export const VALID_AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max', 'none'] as const;

export type AggregationType = typeof VALID_AGGREGATIONS[number];

export const VALID_OPERATORS = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'contains', 'startsWith', 'endsWith',
  'in', 'notIn',
  'between',
  'isNull', 'isNotNull',
] as const;

export type FilterOperator = typeof VALID_OPERATORS[number];

export const VALID_CHART_TYPES = ['bar', 'line', 'pie', 'table'] as const;

export type ChartType = typeof VALID_CHART_TYPES[number];

export const VALID_EXPORT_FORMATS = ['pdf', 'excel', 'csv', 'json'] as const;

export type ExportFormat = typeof VALID_EXPORT_FORMATS[number];

// ============================================
// Field Schema
// ============================================

export const reportFieldSchema = z.object({
  key: z.string().min(1, 'Field key is required'),
  label: z.string().min(1, 'Field label is required'),
  aggregation: z.enum(VALID_AGGREGATIONS, {
    message: 'Invalid aggregation type',
  }),
});

export type ReportFieldInput = z.infer<typeof reportFieldSchema>;

// ============================================
// Filter Schema
// ============================================

export const reportFilterSchema = z.object({
  field: z.string().min(1, 'Filter field is required'),
  operator: z.enum(VALID_OPERATORS, {
    message: 'Invalid filter operator',
  }),
  value: z.unknown().optional(),
  value2: z.unknown().optional(),
}).refine(
  (data) => {
    // isNull and isNotNull don't require a value
    if (data.operator === 'isNull' || data.operator === 'isNotNull') return true;
    // between requires value2
    if (data.operator === 'between') return data.value2 !== undefined && data.value2 !== null;
    // All other operators require value
    return data.value !== undefined && data.value !== null;
  },
  {
    message: 'Filter value is required for this operator',
    path: ['value'],
  }
);

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;

// ============================================
// Report Template Create Schema
// ============================================

export const createReportTemplateSchema = z.object({
  name: z.string().min(1, 'Report name is required').max(200),
  nameAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  dataSource: z.enum(VALID_DATA_SOURCES, {
    message: 'Invalid data source',
  }),
  fields: z.array(reportFieldSchema).min(1, 'At least one field is required'),
  filters: z.array(reportFilterSchema).default([]),
  groupBy: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  chartType: z.enum(VALID_CHART_TYPES).default('table'),
  isPublic: z.boolean().default(false),
});

export type CreateReportTemplateInput = z.infer<typeof createReportTemplateSchema>;

// ============================================
// Report Template Update Schema
// ============================================

export const updateReportTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  dataSource: z.enum(VALID_DATA_SOURCES).optional(),
  fields: z.array(reportFieldSchema).min(1).optional(),
  filters: z.array(reportFilterSchema).optional(),
  groupBy: z.string().nullable().optional(),
  sortBy: z.string().nullable().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  chartType: z.enum(VALID_CHART_TYPES).optional(),
  isPublic: z.boolean().optional(),
});

export type UpdateReportTemplateInput = z.infer<typeof updateReportTemplateSchema>;

// ============================================
// Report Execution Schema
// ============================================

export const inlineReportDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  dataSource: z.enum(VALID_DATA_SOURCES),
  fields: z.array(reportFieldSchema).min(1),
  filters: z.array(reportFilterSchema).default([]),
  groupBy: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  chartType: z.enum(VALID_CHART_TYPES).default('table'),
});

export type InlineReportDefinitionInput = z.infer<typeof inlineReportDefinitionSchema>;

export const executeReportSchema = z.object({
  reportId: z.string().optional(),
  definition: inlineReportDefinitionSchema.optional(),
}).refine(
  (data) => data.reportId || data.definition,
  { message: 'Either reportId or definition must be provided' }
);

export type ExecuteReportInput = z.infer<typeof executeReportSchema>;

// ============================================
// Report Export Schema
// ============================================

export const exportReportSchema = z.object({
  format: z.enum(VALID_EXPORT_FORMATS, {
    message: 'Invalid export format. Supported: pdf, excel, csv, json',
  }).default('pdf'),
  language: z.enum(['ar', 'en']).default('ar'),
  title: z.string().max(200).optional(),
  // Allow overriding filters at export time
  filters: z.array(reportFilterSchema).optional(),
});

export type ExportReportInput = z.infer<typeof exportReportSchema>;
