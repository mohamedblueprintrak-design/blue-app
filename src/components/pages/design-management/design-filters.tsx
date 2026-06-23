"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenTool, Plus, Filter } from "lucide-react";
import type { ProjectOption } from "./types";

interface DesignFiltersProps {
  language: "ar" | "en";
  filterProject: string;
  onFilterProjectChange: (value: string) => void;
  projects: ProjectOption[];
  phaseCount: number;
  onAddPhase: () => void;
}

export function DesignFilters({
  language,
  filterProject,
  onFilterProjectChange,
  projects,
  phaseCount,
  onAddPhase,
}: DesignFiltersProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <PenTool className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {tAuto('auto.designManagement')}
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {phaseCount} {tAuto('auto.designPhases')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
        <Select value={filterProject} onValueChange={onFilterProjectChange}>
          <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg">
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
        <Button
          size="sm"
          className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
          onClick={onAddPhase}
        >
          <Plus className="h-3.5 w-3.5 me-1" />
          {tAuto('auto.newPhase')}
        </Button>
      </div>
    </div>
  );
}
