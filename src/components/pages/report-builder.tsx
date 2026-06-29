"use client";

import { useTranslations } from 'next-intl';
/* eslint-disable */


/**
 * Custom Report Builder Component
 * مكوّن منشئ التقارير المخصص
 *
 * Step-by-step wizard for building custom reports:
 * 1. Select data source
 * 2. Select fields
 * 3. Add filters
 * 4. Configure grouping & sorting
 * 5. Select output format
 * 6. Preview & save/execute
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Play,
  Save,
  Loader2,
  Download,
  Database,
  Columns3,
  Filter,
  ArrowUpDown,
  FileOutput,
  Eye,
  X,
  TableIcon,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
} from "lucide-react";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import { useToastFeedback } from "@/hooks/use-toast-feedback";

// ============================================
// Types (extracted to ./report-builder/types)
// ============================================
import type {
  DataSourceName,
  AggregationType,
  FilterOperator,
  ChartType,
  OutputFormat,
  FieldMeta,
  DataSourceMeta,
  FilterOperatorMeta,
  ReportField,
  ReportFilter,
  ReportDefinition,
  SavedReport,
} from "./report-builder/types";

// ============================================
// Constants (extracted to ./report-builder/constants)
// ============================================
import { STEPS, isFilterableField, CHART_OPTIONS } from "./report-builder/constants";

// ============================================
// Step definitions (now imported from constants)
// ============================================
// Main Component
// ============================================

interface ReportBuilderProps {
  language?: "ar" | "en";
  onReportSaved?: () => void;
}

export default function ReportBuilder({ onReportSaved }: ReportBuilderProps) {
  const tAuto = useTranslations();
  const lang = useLang();
  const ar = lang === "ar";
  const toastFeedback = useToastFeedback({ ar });
  const queryClient = useQueryClient();

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Report definition state
  const [definition, setDefinition] = useState<ReportDefinition>({
    name: "",
    dataSource: "projects",
    fields: [],
    filters: [],
    groupBy: undefined,
    sortBy: undefined,
    sortOrder: "desc",
    chartType: "table",
    format: "json",
  });

  // Preview results
  const [previewData, setPreviewData] = useState<{
    columns: Array<{ key: string; label: string }>;
    rows: Record<string, unknown>[];
    totalRows: number;
  } | null>(null);

  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ============================================
  // Data fetching
  // ============================================

  const { data: dsData, isLoading: dsLoading } = useQuery({
    queryKey: ["report-builder-datasources"],
    queryFn: async () => {
      const res = await fetch("/api/report-builder/datasources");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data as {
        dataSources: DataSourceMeta[];
        filterOperators: FilterOperatorMeta[];
      };
    },
  });

  const { data: savedReports } = useQuery({
    queryKey: ["report-builder-templates"],
    queryFn: async () => {
      const res = await fetch("/api/report-builder");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data as SavedReport[];
    },
  });

  const dataSources = dsData?.dataSources ?? [];
  const filterOperators = dsData?.filterOperators ?? [];

  // Get fields for current data source
  const currentDsMeta = dataSources.find((ds) => ds.key === definition.dataSource);
  const availableFields = currentDsMeta?.fields ?? [];

  // ============================================
  // Execute report
  // ============================================

  const executeMutation = useMutation({
    mutationFn: async (def: ReportDefinition) => {
      const res = await fetch("/api/report-builder/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition: def }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to execute report");
      }
      return res;
    },
    onSuccess: async (res) => {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/csv")) {
        // Download CSV
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${definition.name || "report"}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toastFeedback.showSuccess(tAuto('auto.cSVExported'));
      } else if (contentType.includes("application/pdf")) {
        // Download PDF
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        toastFeedback.showSuccess(tAuto('auto.pDFExported'));
      } else {
        // JSON
        const json = await res.json();
        setPreviewData(json.data?.result ?? null);
      }
    },
    onError: (err: Error) => {
      toastFeedback.showError(err.message || (tAuto('auto.failedToExecuteReport')));
    },
  });

  // ============================================
  // Save report
  // ============================================

  const saveMutation = useMutation({
    mutationFn: async (def: ReportDefinition) => {
      const res = await fetch("/api/report-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: def.name,
          nameAr: def.nameAr,
          description: def.description,
          dataSource: def.dataSource,
          fields: def.fields,
          filters: def.filters,
          groupBy: def.groupBy || undefined,
          sortBy: def.sortBy || undefined,
          sortOrder: def.sortOrder,
          chartType: def.chartType,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to save report");
      }
      return res.json();
    },
    onSuccess: () => {
      toastFeedback.showSuccess(tAuto('auto.reportSaved'));
      queryClient.invalidateQueries({ queryKey: ["report-builder-templates"] });
      onReportSaved?.();
    },
    onError: (err: Error) => {
      toastFeedback.showError(err.message || (tAuto('auto.failedToSaveReport')));
    },
  });

  // ============================================
  // Load saved report
  // ============================================

  const loadSavedReport = useCallback(
    (report: SavedReport) => {
      setDefinition({
        name: report.name,
        nameAr: report.nameAr ?? undefined,
        description: report.description ?? undefined,
        dataSource: report.dataSource as DataSourceName,
        fields: report.fields,
        filters: report.filters,
        groupBy: report.groupBy ?? undefined,
        sortBy: report.sortBy ?? undefined,
        sortOrder: (report.sortOrder as "asc" | "desc") || "desc",
        chartType: (report.chartType as ChartType) || "table",
        format: "json",
      });
      setCurrentStep(0);
      toastFeedback.showSuccess(tAuto('auto.reportLoaded'));
    },
    [ar, toastFeedback, tAuto]
  );

  // ============================================
  // Helpers
  // ============================================

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!definition.dataSource;
      case 1:
        return definition.fields.length > 0;
      case 2:
        return true; // Filters are optional
      case 3:
        return true; // Grouping/sorting are optional
      case 4:
        return true; // Output format has defaults
      case 5:
        return definition.fields.length > 0;
      default:
        return false;
    }
  };

  const handlePreview = () => {
    if (!definition.name.trim()) {
      definition.name = tAuto('auto.customReport');
    }
    executeMutation.mutate({ ...definition, format: "json" });
  };

  const handleExport = (format: OutputFormat) => {
    executeMutation.mutate({ ...definition, format });
  };

  const handleSave = () => {
    if (!definition.name.trim()) {
      toastFeedback.showError(tAuto('auto.pleaseEnterAReportName'));
      return;
    }
    saveMutation.mutate(definition);
  };

  const toggleField = (field: FieldMeta) => {
    const exists = definition.fields.find((f) => f.key === field.key);
    if (exists) {
      setDefinition((prev) => ({
        ...prev,
        fields: prev.fields.filter((f) => f.key !== field.key),
      }));
    } else {
      setDefinition((prev) => ({
        ...prev,
        fields: [
          ...prev.fields,
          {
            key: field.key,
            label: ar ? field.labelAr : field.labelEn,
            aggregation: field.aggregatable ? "sum" : "none",
          },
        ],
      }));
    }
  };

  const updateFieldAggregation = (key: string, aggregation: AggregationType) => {
    setDefinition((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, aggregation } : f)),
    }));
  };

  const addFilter = () => {
    setDefinition((prev) => ({
      ...prev,
      filters: [
        ...prev.filters,
        { field: availableFields[0]?.key || "", operator: "eq", value: "" },
      ],
    }));
  };

  const removeFilter = (index: number) => {
    setDefinition((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  };

  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    setDefinition((prev) => ({
      ...prev,
      filters: prev.filters.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    }));
  };

  // ============================================
  // Render
  // ============================================

  const gridStroke = isDark ? "#334155" : "#e2e8f0";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
            <BarChart3 className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {tAuto('auto.customReportBuilder')}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {tAuto('auto.buildCustomReportsFromMultipleDataSource')}
            </p>
          </div>
        </div>
      </div>

      {/* Saved Reports Quick Load */}
      {savedReports && savedReports.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
              {tAuto('auto.savedReports')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {savedReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => loadSavedReport(report)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-navy-50 dark:hover:bg-brand-navy-900/20 hover:text-brand-navy-700 dark:hover:text-brand-navy-300 transition-all border border-slate-200 dark:border-slate-700"
                >
                  {report.nameAr && ar ? report.nameAr : report.name}
                  <span className="ml-1.5 text-[10px] text-slate-400">
                    ({report.dataSource})
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <button
              key={step.key}
              onClick={() => idx <= currentStep && setCurrentStep(idx)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-brand-navy-600 text-white shadow-sm shadow-brand-navy-600/25"
                  : isCompleted
                    ? "bg-brand-navy-50 dark:bg-brand-navy-900/20 text-brand-navy-700 dark:text-brand-navy-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              )}
            >
              <StepIcon className="h-3.5 w-3.5" />
              {ar ? step.labelAr : step.labelEn}
            </button>
          );
        })}
      </div>

      {/* Report Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
            {tAuto('auto.reportName')} *
          </Label>
          <Input
            value={definition.name}
            onChange={(e) => setDefinition((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={tAuto('auto.enterReportName')}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
            {tAuto('auto.nameArabic')}
          </Label>
          <Input
            value={definition.nameAr ?? ""}
            onChange={(e) => setDefinition((prev) => ({ ...prev, nameAr: e.target.value || undefined }))}
            placeholder={tAuto('auto.reportNameInArabic')}
            className="h-9 text-sm"
            dir="rtl"
          />
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-slate-200 dark:border-slate-700/50 min-h-[300px]">
        <CardContent className="p-5">
          {/* ===== Step 1: Data Source ===== */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {tAuto('auto.selectDataSource')}
              </h3>
              {dsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-navy-500" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {dataSources.map((ds) => (
                    <button
                      key={ds.key}
                      onClick={() =>
                        setDefinition((prev) => ({
                          ...prev,
                          dataSource: ds.key,
                          fields: [], // Reset fields when data source changes
                          filters: [],
                          groupBy: undefined,
                          sortBy: undefined,
                        }))
                      }
                      className={cn(
                        "p-4 rounded-xl text-center transition-all border-2",
                        definition.dataSource === ds.key
                          ? "border-brand-navy-500 bg-brand-navy-50 dark:bg-brand-navy-900/20 shadow-sm shadow-brand-navy-500/20"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center",
                          definition.dataSource === ds.key
                            ? "bg-brand-navy-100 dark:bg-brand-navy-800"
                            : "bg-slate-100 dark:bg-slate-800"
                        )}
                      >
                        <Database
                          className={cn(
                            "h-5 w-5",
                            definition.dataSource === ds.key
                              ? "text-brand-navy-600 dark:text-brand-navy-400"
                              : "text-slate-400"
                          )}
                        />
                      </div>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          definition.dataSource === ds.key
                            ? "text-brand-navy-700 dark:text-brand-navy-300"
                            : "text-slate-600 dark:text-slate-400"
                        )}
                      >
                        {ar ? ds.labelAr : ds.labelEn}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== Step 2: Fields ===== */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {tAuto('auto.selectFields')}
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {definition.fields.length} {tAuto('auto.selected1')}
                </Badge>
              </div>
              {availableFields.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  {tAuto('auto.selectADataSourceFirst')}
                </p>
              ) : (
                <div className="space-y-2">
                  {availableFields.map((field) => {
                    const isSelected = definition.fields.some((f) => f.key === field.key);
                    const selectedField = definition.fields.find((f) => f.key === field.key);
                    return (
                      <div
                        key={field.key}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          isSelected
                            ? "border-brand-navy-200 dark:border-brand-navy-800 bg-brand-navy-50/50 dark:bg-brand-navy-900/10"
                            : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleField(field)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {ar ? field.labelAr : field.labelEn}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {field.key} · {field.type}
                            {field.aggregatable ? ` · ${tAuto('auto.aggregatable')}` : ""}
                          </p>
                        </div>
                        {isSelected && field.aggregatable && (
                          <Select
                            value={selectedField?.aggregation ?? "none"}
                            onValueChange={(val) =>
                              updateFieldAggregation(field.key, val as AggregationType)
                            }
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{tAuto('auto.none')}</SelectItem>
                              <SelectItem value="sum">{tAuto('auto.sum')}</SelectItem>
                              <SelectItem value="avg">{tAuto('auto.avg')}</SelectItem>
                              <SelectItem value="count">{tAuto('auto.count')}</SelectItem>
                              <SelectItem value="min">{tAuto('auto.min1')}</SelectItem>
                              <SelectItem value="max">{tAuto('auto.max')}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== Step 3: Filters ===== */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {tAuto('auto.addFilters')}
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={addFilter}
                >
                  <Plus className="h-3 w-3" />
                  {tAuto('auto.add')}
                </Button>
              </div>
              {definition.filters.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  {tAuto('auto.noFiltersFilteringIsOptional')}
                </p>
              ) : (
                <div className="space-y-2">
                  {definition.filters.map((filter, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {/* Field selector */}
                      <Select
                        value={filter.field}
                        onValueChange={(val) => updateFilter(idx, { field: val })}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue placeholder={tAuto('auto.field')} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                              {ar ? f.labelAr : f.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Operator selector */}
                      <Select
                        value={filter.operator}
                        onValueChange={(val) =>
                          updateFilter(idx, { operator: val as FilterOperator })
                        }
                      >
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOperators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {ar ? op.labelAr : op.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value input */}
                      <Input
                        value={String(filter.value ?? "")}
                        onChange={(e) => updateFilter(idx, { value: e.target.value })}
                        placeholder={tAuto('auto.value')}
                        className="h-8 text-xs flex-1"
                      />

                      {/* Value2 input for 'between' */}
                      {filter.operator === "between" && (
                        <Input
                          value={String(filter.value2 ?? "")}
                          onChange={(e) => updateFilter(idx, { value2: e.target.value })}
                          placeholder={tAuto('auto.value2')}
                          className="h-8 text-xs flex-1"
                        />
                      )}

                      {/* Remove filter */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => removeFilter(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== Step 4: Grouping & Sorting ===== */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {tAuto('auto.groupingSorting')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Group By */}
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                    {tAuto('auto.groupBy')}
                  </Label>
                  <Select
                    value={definition.groupBy ?? "_none"}
                    onValueChange={(val) =>
                      setDefinition((prev) => ({
                        ...prev,
                        groupBy: val === "_none" ? undefined : val,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={tAuto('auto.noGrouping')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">
                        {tAuto('auto.noGrouping')}
                      </SelectItem>
                      {availableFields
                        .filter((f) => f.type === "string" || f.type === "date")
                        .map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {ar ? f.labelAr : f.labelEn}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                    {tAuto('auto.sortBy1')}
                  </Label>
                  <Select
                    value={definition.sortBy ?? "_none"}
                    onValueChange={(val) =>
                      setDefinition((prev) => ({
                        ...prev,
                        sortBy: val === "_none" ? undefined : val,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={tAuto('auto.noSorting')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">
                        {tAuto('auto.noSorting')}
                      </SelectItem>
                      {availableFields.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {ar ? f.labelAr : f.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                    {tAuto('auto.sortOrder')}
                  </Label>
                  <Select
                    value={definition.sortOrder ?? "desc"}
                    onValueChange={(val) =>
                      setDefinition((prev) => ({
                        ...prev,
                        sortOrder: val as "asc" | "desc",
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">
                        {tAuto('auto.ascending')}
                      </SelectItem>
                      <SelectItem value="desc">
                        {tAuto('auto.descending')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ===== Step 5: Output Format ===== */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {tAuto('auto.outputFormat')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    {
                      key: "table" as ChartType,
                      icon: TableIcon,
                      labelEn: "Table",
                      labelAr: "جدول",
                    },
                    {
                      key: "bar" as ChartType,
                      icon: BarChart3,
                      labelEn: "Bar Chart",
                      labelAr: "رسم بياني شريطي",
                    },
                    {
                      key: "line" as ChartType,
                      icon: LineChartIcon,
                      labelEn: "Line Chart",
                      labelAr: "رسم بياني خطي",
                    },
                    {
                      key: "pie" as ChartType,
                      icon: PieChartIcon,
                      labelEn: "Pie Chart",
                      labelAr: "رسم دائري",
                    },
                  ] as const
                ).map((ct) => {
                  const CtIcon = ct.icon;
                  const isActive = definition.chartType === ct.key;
                  return (
                    <button
                      key={ct.key}
                      onClick={() =>
                        setDefinition((prev) => ({ ...prev, chartType: ct.key }))
                      }
                      className={cn(
                        "p-4 rounded-xl text-center transition-all border-2",
                        isActive
                          ? "border-brand-navy-500 bg-brand-navy-50 dark:bg-brand-navy-900/20 shadow-sm shadow-brand-navy-500/20"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      <CtIcon
                        className={cn(
                          "h-6 w-6 mx-auto mb-2",
                          isActive
                            ? "text-brand-navy-600 dark:text-brand-navy-400"
                            : "text-slate-400"
                        )}
                      />
                      <p
                        className={cn(
                          "text-xs font-medium",
                          isActive
                            ? "text-brand-navy-700 dark:text-brand-navy-300"
                            : "text-slate-600 dark:text-slate-400"
                        )}
                      >
                        {ar ? ct.labelAr : ct.labelEn}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Export format */}
              <div className="mt-4">
                <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                  {tAuto('auto.exportFormat')}
                </Label>
                <Select
                  value={definition.format ?? "json"}
                  onValueChange={(val) =>
                    setDefinition((prev) => ({ ...prev, format: val as OutputFormat }))
                  }
                >
                  <SelectTrigger className="h-9 w-48 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ===== Step 6: Preview ===== */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {tAuto('auto.reportPreview')}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handlePreview}
                    disabled={executeMutation.isPending}
                  >
                    {executeMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {tAuto('auto.run')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => handleExport("csv")}
                    disabled={executeMutation.isPending}
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => handleExport("pdf")}
                    disabled={executeMutation.isPending}
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-brand-navy-600 hover:bg-brand-navy-700"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {tAuto('auto.save')}
                  </Button>
                </div>
              </div>

              {/* Report definition summary */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">
                      {tAuto('auto.dataSource')}
                    </span>{" "}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {currentDsMeta
                        ? ar
                          ? currentDsMeta.labelAr
                          : currentDsMeta.labelEn
                        : definition.dataSource}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      {tAuto('auto.fields')}
                    </span>{" "}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {definition.fields.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      {tAuto('auto.filters')}
                    </span>{" "}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {definition.filters.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      {tAuto('auto.format')}
                    </span>{" "}
                    <span className="font-medium text-slate-900 dark:text-white uppercase">
                      {definition.chartType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview results table */}
              {previewData ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                          {previewData.columns.map((col) => (
                            <TableHead key={col.key} className="text-xs font-semibold">
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.map((row, rowIdx) => (
                          <TableRow
                            key={rowIdx}
                            className={
                              rowIdx % 2 === 0
                                ? "bg-white dark:bg-slate-900"
                                : "bg-slate-50/50 dark:bg-slate-800/20"
                            }
                          >
                            {previewData.columns.map((col) => (
                              <TableCell key={col.key} className="text-xs">
                                {row[col.key] !== null && row[col.key] !== undefined
                                  ? String(row[col.key])
                                  : "—"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {previewData.rows.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={previewData.columns.length}
                              className="text-center py-8 text-xs text-slate-400"
                            >
                              {tAuto('auto.noData')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400">
                    {previewData.totalRows} {tAuto('auto.rows')}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Eye className="h-8 w-8 mb-2" />
                  <p className="text-sm">
                    {tAuto('auto.clickRunToPreviewTheReport')}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {tAuto('auto.previous')}
        </Button>
        <span className="text-xs text-slate-400">
          {currentStep + 1} / {STEPS.length}
        </span>
        <Button
          size="sm"
          className="h-8 gap-1 text-xs bg-brand-navy-600 hover:bg-brand-navy-700"
          onClick={() =>
            setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1))
          }
          disabled={currentStep === STEPS.length - 1 || !canGoNext()}
        >
          {tAuto('auto.next')}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
