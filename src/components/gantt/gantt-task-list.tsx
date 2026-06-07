import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GanttTask,
  FlattenedItem,
  isPhaseHeader,
  PHASE_CATEGORY_COLORS,
  PHASE_CATEGORY_LABELS,
  STATUS_ICONS,
  getBarColor,
} from "@/components/gantt/gantt-types";

interface GanttTaskListProps {
  ar: boolean;
  flattenedItems: FlattenedItem[];
  phaseGroups: Record<string, GanttTask[]>;
  onTaskClick: (task: GanttTask) => void;
}

export function GanttTaskList({
  ar,
  flattenedItems,
  phaseGroups,
  onTaskClick,
}: GanttTaskListProps) {
  return (
    <div className="w-72 border-e border-slate-200 dark:border-slate-700/50 flex-shrink-0 bg-white dark:bg-slate-900 hidden md:block">
      <div className="h-10 border-b border-slate-200 dark:border-slate-700/50 flex items-center px-3 bg-slate-50 dark:bg-slate-800/30">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {ar ? "المهمة" : "Task"}
        </span>
      </div>
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
        {flattenedItems.map((item) => {
          if (isPhaseHeader(item)) {
            const { category } = item;
            const phaseInfo = PHASE_CATEGORY_LABELS[category];
            const colorInfo = PHASE_CATEGORY_COLORS[category];
            const taskCount = (phaseGroups[category] || []).length;
            return (
              <div
                key={`phase-${category}`}
                className={cn("h-9 flex items-center px-3 border-b border-slate-100 dark:border-slate-800/50", colorInfo?.bg)}
              >
                <div className={cn("flex items-center gap-2 font-semibold text-xs", colorInfo?.text)}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorInfo?.bar }} />
                  {phaseInfo ? (ar ? phaseInfo.ar : phaseInfo.en) : category}
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-current/30 text-current/70">
                    {taskCount}
                  </Badge>
                </div>
              </div>
            );
          }

          const task = item as GanttTask;
          return (
            <div
              key={task.id}
              className="h-11 border-b border-slate-100 dark:border-slate-800/50 flex items-center px-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
              onClick={() => onTaskClick(task)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getBarColor(task) }} />
                {task.type === "phase" && (
                  <span className="text-[9px] text-violet-500 dark:text-violet-400 font-medium uppercase">{ar ? "مرحلة" : "Phase"}</span>
                )}
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{task.title}</span>
              </div>
              <div className="flex items-center gap-1">
                {STATUS_ICONS[task.status] || STATUS_ICONS.TODO}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">{Math.round(task.progress)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
