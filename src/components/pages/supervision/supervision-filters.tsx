"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { STAGES, ProjectOption } from "./types";

interface ProjectFilterProps {
  ar: boolean;
  filterProject: string;
  onFilterProjectChange: (value: string) => void;
  projects: ProjectOption[];
}

export function ProjectFilter({
  ar,
  filterProject,
  onFilterProjectChange,
  projects,
}: ProjectFilterProps) {
  return (
    <Select value={filterProject} onValueChange={onFilterProjectChange}>
      <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
        <Filter className="h-3 w-3 me-1 text-slate-400" />
        <SelectValue placeholder={ar ? "المشروع" : "Project"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{ar ? "جميع المشاريع" : "All Projects"}</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ===== Stage Selector =====
interface StageSelectorProps {
  ar: boolean;
  selectedStage: string;
  onSelectedStageChange: (value: string) => void;
}

export function StageSelector({ ar, selectedStage, onSelectedStageChange }: StageSelectorProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onSelectedStageChange("all")}
        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          selectedStage === "all"
            ? "bg-teal-600 text-white shadow-sm"
            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
        }`}
      >
        {ar ? "الكل" : "All"}
      </button>
      {STAGES.map((stage) => (
        <button
          key={stage.key}
          onClick={() => onSelectedStageChange(stage.key)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            selectedStage === stage.key
              ? "bg-teal-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {ar ? stage.ar : stage.en}
        </button>
      ))}
    </div>
  );
}

// ===== Violation Filters =====
interface ViolationFiltersProps {
  ar: boolean;
  violationFilterStatus: string;
  violationFilterSeverity: string;
  onViolationFilterStatusChange: (value: string) => void;
  onViolationFilterSeverityChange: (value: string) => void;
}

export function ViolationFilters({
  ar,
  violationFilterStatus,
  violationFilterSeverity,
  onViolationFilterStatusChange,
  onViolationFilterSeverityChange,
}: ViolationFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={violationFilterStatus} onValueChange={onViolationFilterStatusChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
          <Filter className="h-3 w-3 me-1 text-slate-400" />
          <SelectValue placeholder={ar ? "الحالة" : "Status"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{ar ? "جميع الحالات" : "All Status"}</SelectItem>
          <SelectItem value="OPEN">{ar ? "مفتوح" : "Open"}</SelectItem>
          <SelectItem value="IN_PROGRESS">{ar ? "قيد المعالجة" : "In Progress"}</SelectItem>
          <SelectItem value="RESOLVED">{ar ? "تم الحل" : "Resolved"}</SelectItem>
          <SelectItem value="CLOSED">{ar ? "مغلق" : "Closed"}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={violationFilterSeverity} onValueChange={onViolationFilterSeverityChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
          <SelectValue placeholder={ar ? "الخطورة" : "Severity"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{ar ? "جميع المستويات" : "All Severity"}</SelectItem>
          <SelectItem value="LOW">{ar ? "منخفض" : "Low"}</SelectItem>
          <SelectItem value="MEDIUM">{ar ? "متوسط" : "Medium"}</SelectItem>
          <SelectItem value="HIGH">{ar ? "مرتفع" : "High"}</SelectItem>
          <SelectItem value="CRITICAL">{ar ? "حرج" : "Critical"}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
