/**
 * Report Builder — Step definitions and constants
 */

import { Database, Columns3, Filter, ArrowUpDown, FileOutput, Eye } from "lucide-react";

export const STEPS = [
  { key: "datasource", icon: Database, labelEn: "Data Source", labelAr: "مصدر البيانات" },
  { key: "fields", icon: Columns3, labelEn: "Fields", labelAr: "الحقول" },
  { key: "filters", icon: Filter, labelEn: "Filters", labelAr: "التصفية" },
  { key: "sorting", icon: ArrowUpDown, labelEn: "Grouping & Sorting", labelAr: "التجميع والترتيب" },
  { key: "output", icon: FileOutput, labelEn: "Output Format", labelAr: "تنسيق الإخراج" },
  { key: "preview", icon: Eye, labelEn: "Preview", labelAr: "معاينة" },
];

/**
 * Check if a field type is filterable as a string/date
 */
export function isFilterableField(type: string): boolean {
  return type === "string" || type === "date";
}

/**
 * Chart type options for the output step
 */
export const CHART_OPTIONS = [
  { key: "table", labelEn: "Table", labelAr: "جدول" },
  { key: "bar", labelEn: "Bar Chart", labelAr: "رسم بياني شريطي" },
  { key: "line", labelEn: "Line Chart", labelAr: "رسم بياني خطي" },
  { key: "pie", labelEn: "Pie Chart", labelAr: "رسم دائري" },
] as const;
