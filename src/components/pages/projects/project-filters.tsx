"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectFiltersProps {
  isAr: boolean;
  t: (ar: string, en: string) => string;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  viewMode: "table" | "grid";
  onViewModeChange: (value: "table" | "grid") => void;
}

export function ProjectFilters({
  isAr: _isAr,
  t,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  viewMode,
  onViewModeChange,
}: ProjectFiltersProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t("بحث في المشاريع...", "Search projects...")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ps-9 bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-700/50 focus:border-brand-navy-300 dark:focus:border-brand-navy-700"
          />
        </div>
        {/* Pill-style Status Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "ACTIVE", "COMPLETED", "DELAYED", "ON_HOLD", "DESIGN", "SUBMISSION", "APPROVAL", "CONSTRUCTION"] as const).map((s) => {
          const isActive = statusFilter === s;
          const labels: Record<string, { ar: string; en: string; dotColor: string }> = {
            all: { ar: "الكل", en: "All", dotColor: "bg-slate-400" },
            ACTIVE: { ar: "نشط", en: "Active", dotColor: "bg-emerald-500" },
            COMPLETED: { ar: "مكتمل", en: "Completed", dotColor: "bg-brand-navy-500" },
            DELAYED: { ar: "متأخر", en: "Delayed", dotColor: "bg-red-500" },
            ON_HOLD: { ar: "معلق", en: "On Hold", dotColor: "bg-amber-500" },
            DESIGN: { ar: "تصميم", en: "Design", dotColor: "bg-violet-500" },
            SUBMISSION: { ar: "تقديم", en: "Submission", dotColor: "bg-sky-500" },
            APPROVAL: { ar: "اعتماد", en: "Approval", dotColor: "bg-amber-500" },
            CONSTRUCTION: { ar: "تنفيذ", en: "Construction", dotColor: "bg-orange-500" },
          };
          const lbl = labels[s];
          return (
            <button
              key={s}
              onClick={() => onStatusFilterChange(s)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/40 dark:text-brand-navy-300 shadow-sm"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? lbl.dotColor : "bg-transparent")} />
              {t(lbl.ar, lbl.en)}
            </button>
          );
        })}
      </div>
        {/* Type filter - keep select for compactness */}
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t("النوع", "Type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("الكل", "All")}</SelectItem>
            <SelectItem value="VILLA">{t("فيلا", "Villa")}</SelectItem>
            <SelectItem value="BUILDING">{t("مبنى", "Building")}</SelectItem>
            <SelectItem value="COMMERCIAL">{t("تجاري", "Commercial")}</SelectItem>
            <SelectItem value="INDUSTRIAL">{t("صناعي", "Industrial")}</SelectItem>
          </SelectContent>
        </Select>
        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => onViewModeChange("table")}
            className={cn(
              "p-1.5 rounded-md transition-all duration-200",
              viewMode === "table"
                ? "bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/40 dark:text-brand-navy-300 shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all duration-200",
              viewMode === "grid"
                ? "bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/40 dark:text-brand-navy-300 shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
