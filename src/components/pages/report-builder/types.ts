// Types
// ============================================

export type DataSourceName =
  | "projects"
  | "invoices"
  | "tasks"
  | "clients"
  | "employees"
  | "payments"
  | "contracts"
  | "timesheets"
  | "expenses"
  | "commissions";

export type AggregationType = "sum" | "avg" | "count" | "min" | "max" | "none";

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith"
  | "in"
  | "between";

export type ChartType = "bar" | "line" | "pie" | "table";
export type OutputFormat = "json" | "csv" | "pdf";

export interface FieldMeta {
  key: string;
  labelEn: string;
  labelAr: string;
  type: "string" | "number" | "date" | "boolean";
  aggregatable: boolean;
}

export interface DataSourceMeta {
  key: DataSourceName;
  labelEn: string;
  labelAr: string;
  fields: FieldMeta[];
}

export interface FilterOperatorMeta {
  value: FilterOperator;
  labelEn: string;
  labelAr: string;
}

export interface ReportField {
  key: string;
  label: string;
  aggregation: AggregationType;
}

export interface ReportFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  value2?: unknown;
}

export interface ReportDefinition {
  name: string;
  nameAr?: string;
  description?: string;
  dataSource: DataSourceName;
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  chartType?: ChartType;
  format?: OutputFormat;
}

export interface SavedReport {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  dataSource: string;
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy?: string;
  sortBy?: string;
  sortOrder: string;
  chartType: string;
  isPublic: boolean;
  createdAt: string;
