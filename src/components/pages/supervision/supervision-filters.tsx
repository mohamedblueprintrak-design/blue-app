"use client";


import { useTranslations } from 'next-intl';
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
  const tAuto = useTranslations();
  return (
    <Select value={filterProject} onValueChange={onFilterProjectChange}>
      <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
        <Filter className="h-3 w-3 me-1 text-slate-400" />
        <SelectValue placeholder={tAuto('auto.project')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{tAuto('auto.allProjects')}</SelectItem>
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
  const tAuto = useTranslations();
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
        {tAuto('auto.all')}
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
  const tAuto = useTranslations();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={violationFilterStatus} onValueChange={onViolationFilterStatusChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
          <Filter className="h-3 w-3 me-1 text-slate-400" />
          <SelectValue placeholder={tAuto('auto.status1')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tAuto('auto.allStatus')}</SelectItem>
          <SelectItem value="OPEN">{tAuto('auto.open')}</SelectItem>
          <SelectItem value="IN_PROGRESS">{tAuto('auto.inProgress')}</SelectItem>
          <SelectItem value="RESOLVED">{tAuto('auto.resolved')}</SelectItem>
          <SelectItem value="CLOSED">{tAuto('auto.closed')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={violationFilterSeverity} onValueChange={onViolationFilterSeverityChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
          <SelectValue placeholder={tAuto('auto.severity')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tAuto('auto.allSeverity')}</SelectItem>
          <SelectItem value="LOW">{tAuto('auto.low')}</SelectItem>
          <SelectItem value="MEDIUM">{tAuto('auto.medium')}</SelectItem>
          <SelectItem value="HIGH">{tAuto('auto.high')}</SelectItem>
          <SelectItem value="CRITICAL">{tAuto('auto.critical')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
