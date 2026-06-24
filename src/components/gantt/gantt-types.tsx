import React from 'react';
import { Play, Pause, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export interface GanttTask {
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

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#133371",
  IN_PROGRESS: "#133371",
  COMPLETED: "#10b981",
  DONE: "#10b981",
  DELAYED: "#ef4444",
  TODO: "#64748b",
  REVIEW: "#f59e0b",
  CANCELLED: "#94a3b8",
  in_progress: "#133371",
  completed: "#10b981",
  delayed: "#ef4444",
  todo: "#64748b"
};

export const PHASE_CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  ARCHITECTURAL: { bg: "bg-brand-navy-500/20", text: "text-brand-navy-400", bar: "#133371" },
  STRUCTURAL: { bg: "bg-amber-500/20", text: "text-amber-400", bar: "#f59e0b" },
  MEP: { bg: "bg-cyan-500/20", text: "text-cyan-400", bar: "#06b6d4" },
  GOVERNMENT: { bg: "bg-violet-500/20", text: "text-violet-400", bar: "#8b5cf6" },
  CONTRACTING: { bg: "bg-orange-500/20", text: "text-orange-400", bar: "#f97316" },
};

export const PHASE_CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  ARCHITECTURAL: { en: "Architectural", ar: "معماري" },
  STRUCTURAL: { en: "Structural", ar: "إنشائي" },
  MEP: { en: "MEP", ar: "كهرباء وميكانيك" },
  GOVERNMENT: { en: "Government", ar: "حكومي" },
  CONTRACTING: { en: "Contracting", ar: "مقاولات" },
};

export const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  TODO: { en: "To Do", ar: "قيد الانتظار" },
  IN_PROGRESS: { en: "In Progress", ar: "قيد التنفيذ" },
  REVIEW: { en: "Review", ar: "مراجعة" },
  DONE: { en: "Done", ar: "مكتمل" },
  CANCELLED: { en: "Cancelled", ar: "ملغي" },
  ACTIVE: { en: "Active", ar: "نشط" },
  COMPLETED: { en: "Completed", ar: "مكتمل" },
  DELAYED: { en: "Delayed", ar: "متأخر" },
};

export const STATUS_ICONS: Record<string, React.ReactNode> = {
  TODO: <Pause className="w-4 h-4" />,
  IN_PROGRESS: <Play className="w-4 h-4" />,
  ACTIVE: <Play className="w-4 h-4" />,
  REVIEW: <Clock className="w-4 h-4" />,
  DONE: <CheckCircle className="w-4 h-4" />,
  COMPLETED: <CheckCircle className="w-4 h-4" />,
  CANCELLED: <AlertCircle className="w-4 h-4" />,
  DELAYED: <AlertCircle className="w-4 h-4" />,
};

export type FlattenedItem = GanttTask | { type: "phase-header"; category: string };

export function isPhaseHeader(item: FlattenedItem): item is { type: "phase-header"; category: string } {
  return "type" in item && item.type === "phase-header";
}

export function getBarColor(task: GanttTask): string {
  const status = task.status;
  if (status === "IN_PROGRESS" || status === "ACTIVE") return STATUS_COLORS.in_progress;
  if (status === "DONE" || status === "COMPLETED") return STATUS_COLORS.completed;
  if (status === "DELAYED") return STATUS_COLORS.delayed;
  if (task.phaseCategory && PHASE_CATEGORY_COLORS[task.phaseCategory]) {
    return PHASE_CATEGORY_COLORS[task.phaseCategory].bar;
  }
  return STATUS_COLORS.todo;
}
