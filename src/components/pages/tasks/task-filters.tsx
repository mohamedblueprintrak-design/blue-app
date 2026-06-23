"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ListChecks, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { type TaskItem, type ProjectOption, type UserOption, type FilterChipProps } from "./types";

// ===== Filter Chip =====
function FilterChip({ label, active, onClick, count }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        active
          ? "bg-teal-600 text-white shadow-sm shadow-teal-600/25"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          "text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full",
          active ? "bg-teal-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ===== Task Filters Props =====
interface TaskFiltersProps {
  ar: boolean;
  projectId?: string;
  tasks: TaskItem[];
  quickFilter: string;
  setQuickFilter: (val: string) => void;
  filterProject: string;
  setFilterProject: (val: string) => void;
  filterAssignee: string;
  setFilterAssignee: (val: string) => void;
  projects: ProjectOption[];
  users: UserOption[];
  bulkMode: boolean;
  onExitBulkMode: () => void;
  onEnterBulkMode: () => void;
  onAddTask: () => void;
}

export function TaskFilters({
  ar,
  projectId,
  tasks,
  quickFilter,
  setQuickFilter,
  filterProject,
  setFilterProject,
  filterAssignee,
  setFilterAssignee,
  projects,
  users,
  bulkMode,
  onExitBulkMode,
  onEnterBulkMode,
  onAddTask,
}: TaskFiltersProps) {
  const tAuto = useTranslations();
  const now = new Date();
  const urgentCount = tasks.filter((t) => t.priority === "URGENT").length;
  const overdueCount = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
  const govCount = tasks.filter((t) => t.taskType === "GOVERNMENTAL" || t.taskType === "MANDATORY").length;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <ListChecks className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {tAuto('auto.tasks1')}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {tasks.length} {tAuto('auto.totalTasks1')}
            </p>
          </div>
        </div>
        <div className="sm:ms-auto flex items-center gap-2">
          <Button
            size="sm"
            variant={bulkMode ? "default" : "outline"}
            className={cn(
              "h-8 rounded-lg shadow-sm",
              bulkMode
                ? "bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20"
                : "text-slate-600 dark:text-slate-300"
            )}
            onClick={() => { if (bulkMode) onExitBulkMode(); else onEnterBulkMode(); }}
          >
            <CheckSquare className={cn("h-3.5 w-3.5 me-1", bulkMode && "me-0")} />
            {bulkMode
              ? (tAuto('auto.cancel'))
              : (tAuto('auto.bulkSelect'))}
          </Button>
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
            onClick={onAddTask}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {tAuto('auto.addTask')}
          </Button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label={tAuto('auto.all')}
          active={quickFilter === "all"}
          onClick={() => setQuickFilter("all")}
          count={tasks.length}
        />
        <FilterChip
          label={tAuto('auto.urgent')}
          active={quickFilter === "URGENT"}
          onClick={() => setQuickFilter("URGENT")}
          count={urgentCount}
        />
        <FilterChip
          label={tAuto('auto.overdue')}
          active={quickFilter === "OVERDUE"}
          onClick={() => setQuickFilter("OVERDUE")}
          count={overdueCount}
        />
        <FilterChip
          label={tAuto('auto.governmental')}
          active={quickFilter === "governmental"}
          onClick={() => setQuickFilter("governmental")}
          count={govCount}
        />

        {/* Dropdown filters */}
        <div className="flex items-center gap-2 ms-auto">
          {!projectId && (
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[140px] h-7 text-[11px] border-slate-200 dark:border-slate-700 rounded-lg">
                <SelectValue placeholder={tAuto('auto.project')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAuto('auto.allProjects')}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {ar ? p.name : p.nameEn || p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[140px] h-7 text-[11px] border-slate-200 dark:border-slate-700 rounded-lg">
              <SelectValue placeholder={tAuto('auto.assignee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
