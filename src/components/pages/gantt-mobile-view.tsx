"use client";

/**
 * Gantt Mobile View - List fallback for small screens
 * عرض جانت للموبايل - قائمة بديلة للشاشات الصغيرة
 */

import {
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Diamond,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ===== Types =====
interface GanttTask {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  priority: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  dueDate?: string | null;
  progress: number;
  isMilestone: boolean;
  taskType?: string;
  isGovernmental?: boolean;
  type: "task" | "phase";
  phaseCategory?: string;
}

// ===== Status Helpers =====
const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  TODO: { en: "To Do", ar: "قيد الانتظار" },
  IN_PROGRESS: { en: "In Progress", ar: "قيد التنفيذ" },
  REVIEW: { en: "Review", ar: "مراجعة" },
  DONE: { en: "Done", ar: "مكتمل" },
  CANCELLED: { en: "Cancelled", ar: "ملغي" },
  ACTIVE: { en: "Active", ar: "نشط" },
  COMPLETED: { en: "Completed", ar: "مكتمل" },
  DELAYED: { en: "Delayed", ar: "متأخر" },
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  IN_PROGRESS: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  ACTIVE: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DONE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  DELAYED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
};

const STATUS_ICONS_MAP: Record<string, React.ReactNode> = {
  TODO: <Pause className="w-3 h-3" />,
  IN_PROGRESS: <Play className="w-3 h-3" />,
  ACTIVE: <Play className="w-3 h-3" />,
  REVIEW: <Clock className="w-3 h-3" />,
  DONE: <CheckCircle className="w-3 h-3" />,
  COMPLETED: <CheckCircle className="w-3 h-3" />,
  CANCELLED: <AlertCircle className="w-3 h-3" />,
  DELAYED: <AlertCircle className="w-3 h-3" />,
};

const PHASE_CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  ARCHITECTURAL: { en: "Architectural", ar: "معماري" },
  STRUCTURAL: { en: "Structural", ar: "إنشائي" },
  MEP: { en: "MEP", ar: "كهرباء وميكانيك" },
  GOVERNMENT: { en: "Government", ar: "حكومي" },
  CONTRACTING: { en: "Contracting", ar: "مقاولات" },
};

const PHASE_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  ARCHITECTURAL: { bg: "bg-teal-500/10 dark:bg-teal-500/20", text: "text-teal-600 dark:text-teal-400" },
  STRUCTURAL: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  MEP: { bg: "bg-cyan-500/10 dark:bg-cyan-500/20", text: "text-cyan-600 dark:text-cyan-400" },
  GOVERNMENT: { bg: "bg-violet-500/10 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400" },
  CONTRACTING: { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400" },
};

function formatDate(dateStr: string | null, ar: boolean): string {
  if (!dateStr) return ar ? "غير محدد" : "TBD";
  try {
    return new Date(dateStr).toLocaleDateString(ar ? "ar-SA" : "en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getProgressColor(progress: number): string {
  if (progress >= 100) return "bg-emerald-500";
  if (progress >= 50) return "bg-teal-500";
  if (progress >= 25) return "bg-amber-500";
  return "bg-slate-400";
}

// ===== Component =====
interface GanttMobileViewProps {
  tasks: GanttTask[];
  ar: boolean;
  onTaskClick?: (task: GanttTask) => void;
}

export function GanttMobileView({ tasks, ar, onTaskClick }: GanttMobileViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {ar ? "لا توجد مهام" : "No tasks found"}
      </div>
    );
  }

  return (
    <div className="space-y-2" role="list" aria-label={ar ? "قائمة المهام" : "Task list"}>
      {tasks.map((task) => {
        const statusLabel = STATUS_LABELS[task.status] || STATUS_LABELS.TODO;
        const badgeStyle = STATUS_BADGE_STYLES[task.status] || STATUS_BADGE_STYLES.TODO;
        const statusIcon = STATUS_ICONS_MAP[task.status] || STATUS_ICONS_MAP.TODO;
        const phaseInfo = task.phaseCategory ? PHASE_CATEGORY_LABELS[task.phaseCategory] : null;
        const phaseColors = task.phaseCategory ? PHASE_CATEGORY_COLORS[task.phaseCategory] : null;

        return (
          <div
            key={task.id}
            role="listitem"
            className={cn(
              "p-3 border rounded-lg transition-colors",
              "border-slate-200 dark:border-slate-700/50",
              "bg-white dark:bg-slate-900",
              onTaskClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800"
            )}
            onClick={() => onTaskClick?.(task)}
            tabIndex={onTaskClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onTaskClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onTaskClick(task);
              }
            }}
            aria-label={task.title}
          >
            {/* Row 1: Title + Status Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Milestone indicator */}
                {task.isMilestone && (
                  <Diamond className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 fill-amber-500" />
                )}
                <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                  {task.title}
                </span>
              </div>
              <Badge
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 border-0 gap-0.5 font-medium flex-shrink-0",
                  badgeStyle
                )}
              >
                {statusIcon}
                {ar ? statusLabel.ar : statusLabel.en}
              </Badge>
            </div>

            {/* Row 2: Phase category (if any) */}
            {phaseInfo && phaseColors && (
              <div className="mt-1.5">
                <span className={cn(
                  "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded",
                  phaseColors.bg,
                  phaseColors.text
                )}>
                  {ar ? phaseInfo.ar : phaseInfo.en}
                </span>
              </div>
            )}

            {/* Row 3: Dates */}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{formatDate(task.startDate, ar)}</span>
              <span aria-hidden="true">&rarr;</span>
              <span>{formatDate(task.endDate, ar)}</span>
              {task.type === "phase" && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-1 border-violet-300 dark:border-violet-600 text-violet-600 dark:text-violet-400">
                  {ar ? "مرحلة" : "Phase"}
                </Badge>
              )}
            </div>

            {/* Row 4: Progress bar */}
            <div className="flex items-center gap-2 mt-2">
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700"
                role="progressbar"
                aria-valuenow={Math.round(task.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={ar ? `التقدم ${task.progress}%` : `Progress ${task.progress}%`}
              >
                <div
                  className={cn("h-full rounded-full transition-all duration-300", getProgressColor(task.progress))}
                  style={{ width: `${Math.max(Math.round(task.progress), 2)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums w-8 text-end">
                {Math.round(task.progress)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { GanttTask as GanttMobileViewTask };
