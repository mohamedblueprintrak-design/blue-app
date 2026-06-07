import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";

// ===== Task Types =====
export interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  progress: number;
  assigneeId: string | null;
  projectId: string | null;
  assignee: { id: string; name: string; email: string; avatar: string } | null;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  dueDate: string | null;
  startDate: string | null;
  taskType: string;
  isGovernmental: boolean; // computed from taskType for backward compatibility
  slaDays: number | null;
  createdAt: string;
  _count?: { subtasks: number; completedSubtasks: number };
  commentCount?: number;
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

export interface UserOption {
  id: string;
  name: string;
  EMAIL: string;
  avatar: string;
}

export interface TasksKanbanProps {
  language: "ar" | "en";
  projectId?: string;
}

// ===== Kanban Columns =====
export const COLUMNS = [
  { id: "TODO", borderAccent: "border-t-slate-400", bg: "bg-slate-50/70 dark:bg-slate-800/30 backdrop-blur-sm", border: "border-slate-200/60 dark:border-slate-700/40", headerBg: "bg-gradient-to-b from-slate-100/80 to-transparent dark:from-slate-800/60 dark:to-transparent" },
  { id: "IN_PROGRESS", borderAccent: "border-t-amber-400", bg: "bg-amber-50/50 dark:bg-amber-950/10 backdrop-blur-sm", border: "border-amber-200/60 dark:border-amber-800/40", headerBg: "bg-gradient-to-b from-amber-100/60 to-transparent dark:from-amber-950/30 dark:to-transparent" },
  { id: "REVIEW", borderAccent: "border-t-teal-400", bg: "bg-teal-50/50 dark:bg-teal-950/10 backdrop-blur-sm", border: "border-teal-200/60 dark:border-teal-800/40", headerBg: "bg-gradient-to-b from-teal-100/60 to-transparent dark:from-teal-950/30 dark:to-transparent" },
  { id: "DONE", borderAccent: "border-t-emerald-400", bg: "bg-emerald-50/50 dark:bg-emerald-950/10 backdrop-blur-sm", border: "border-emerald-200/60 dark:border-emerald-800/40", headerBg: "bg-gradient-to-b from-emerald-100/60 to-transparent dark:from-emerald-950/30 dark:to-transparent" },
  { id: "CANCELLED", borderAccent: "border-t-red-400", bg: "bg-red-50/40 dark:bg-red-950/10 backdrop-blur-sm", border: "border-red-200/60 dark:border-red-800/40", headerBg: "bg-gradient-to-b from-red-100/60 to-transparent dark:from-red-950/30 dark:to-transparent" },
] as const;

export function getColumnLabel(colId: string, ar: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    TODO: { ar: "للتنفيذ", en: "To Do" },
    IN_PROGRESS: { ar: "قيد التنفيذ", en: "In Progress" },
    REVIEW: { ar: "مراجعة", en: "Review" },
    DONE: { ar: "مكتمل", en: "Done" },
    CANCELLED: { ar: "ملغي", en: "Cancelled" },
  };
  return ar ? labels[colId]?.ar || colId : labels[colId]?.en || colId;
}

export function getPriorityConfig(priority: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string; leftBorder: string; dotColor: string; gradient: string }> = {
    NORMAL: { label: "عادي", labelEn: "Normal", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", leftBorder: "border-s-slate-300 dark:border-s-slate-600", dotColor: "bg-slate-400", gradient: "" },
    MEDIUM: { label: "متوسط", labelEn: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", leftBorder: "border-s-amber-400 dark:border-s-amber-500", dotColor: "bg-amber-500", gradient: "bg-gradient-to-l from-amber-50/30 to-white dark:from-amber-950/10 dark:to-slate-900" },
    HIGH: { label: "عالي", labelEn: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", leftBorder: "border-s-orange-500 dark:border-s-orange-500", dotColor: "bg-orange-500", gradient: "bg-gradient-to-l from-orange-50/30 to-white dark:from-orange-950/10 dark:to-slate-900" },
    URGENT: { label: "عاجل", labelEn: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", leftBorder: "border-s-red-500 dark:border-s-red-500", dotColor: "bg-red-500", gradient: "bg-gradient-to-l from-red-50/30 to-white dark:from-red-950/10 dark:to-slate-900" },
  };
  return configs[priority] || configs.NORMAL;
}

// ===== Filter Chip Props =====
export interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

// ===== Callback types for drag handlers =====
export type HandleDragStart = (event: DragStartEvent) => void;
export type HandleDragEnd = (event: DragEndEvent) => void;
export type HandleDragOver = (event: DragOverEvent) => void;
