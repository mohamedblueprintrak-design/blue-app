"use client";

/**
 * Gantt Chart Page - Full-featured project scheduling timeline
 * مخطط جانت - جدول زمني متكامل للمشاريع
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  GripHorizontal,
  Diamond,
  Layers,
  GanttChart,
  CalendarDays,
  TrendingUp,
  BarChart3,
  Loader2,
  List,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { GanttMobileView } from "@/components/pages/gantt-mobile-view";

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
  isGovernmental?: boolean; // computed from taskType for display
  type: "task" | "phase";
  phaseCategory?: string;
}

// ===== Color Constants (teal-based) =====
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#133371",
  IN_PROGRESS: "#133371",
  COMPLETED: "#10b981",
  DONE: "#10b981",
  DELAYED: "#ef4444",
  TODO: "#64748b",
  REVIEW: "#f59e0b",
  CANCELLED: "#94a3b8",
};

const PHASE_CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  ARCHITECTURAL: { bg: "bg-teal-500/20", text: "text-teal-400", bar: "#133371" },
  STRUCTURAL: { bg: "bg-amber-500/20", text: "text-amber-400", bar: "#f59e0b" },
  MEP: { bg: "bg-cyan-500/20", text: "text-cyan-400", bar: "#06b6d4" },
  GOVERNMENT: { bg: "bg-violet-500/20", text: "text-violet-400", bar: "#8b5cf6" },
  CONTRACTING: { bg: "bg-orange-500/20", text: "text-orange-400", bar: "#f97316" },
};

const PHASE_CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  ARCHITECTURAL: { en: "Architectural", ar: "معماري" },
  STRUCTURAL: { en: "Structural", ar: "إنشائي" },
  MEP: { en: "MEP", ar: "كهرباء وميكانيك" },
  GOVERNMENT: { en: "Government", ar: "حكومي" },
  CONTRACTING: { en: "Contracting", ar: "مقاولات" },
};

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

const STATUS_ICONS: Record<string, React.ReactNode> = {
  TODO: <Pause className="w-4 h-4" />,
  IN_PROGRESS: <Play className="w-4 h-4" />,
  ACTIVE: <Play className="w-4 h-4" />,
  REVIEW: <Clock className="w-4 h-4" />,
  DONE: <CheckCircle className="w-4 h-4" />,
  COMPLETED: <CheckCircle className="w-4 h-4" />,
  CANCELLED: <AlertCircle className="w-4 h-4" />,
  DELAYED: <AlertCircle className="w-4 h-4" />,
};

function getBarColor(task: GanttTask): string {
  const status = task.status;
  if (status === "IN_PROGRESS" || status === "ACTIVE") return STATUS_COLORS.in_progress;
  if (status === "DONE" || status === "COMPLETED") return STATUS_COLORS.completed;
  if (status === "DELAYED") return STATUS_COLORS.delayed;
  if (task.phaseCategory && PHASE_CATEGORY_COLORS[task.phaseCategory]) {
    return PHASE_CATEGORY_COLORS[task.phaseCategory].bar;
  }
  return STATUS_COLORS.todo;
}

// ===== Main Component =====
interface GanttPageProps {
  language: "ar" | "en";
}

export default function GanttPage({ language }: GanttPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showPhaseGroups, setShowPhaseGroups] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "gantt">("list");
  const isMobile = useIsMobile();

  // Drag state
  const [draggedTask, setDraggedTask] = useState<GanttTask | null>(null);
  const [dragMode, setDragMode] = useState<"move" | "resize-left" | "resize-right" | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalDates, setOriginalDates] = useState<{ start: string | null; end: string | null } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Fetch tasks
  const { data, isLoading } = useQuery<{ success: boolean; data: GanttTask[] }>({
    queryKey: ["gantt-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/gantt");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      // Use rAF to defer setState and avoid cascading renders
      const id = requestAnimationFrame(() => setTasks(data.data));
      return () => cancelAnimationFrame(id);
    }
  }, [data]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (task: GanttTask) => {
      const res = await fetch("/api/gantt", {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          id: task.id,
          title: task.title,
          status: task.status,
          progress: task.progress,
          startDate: task.startDate,
          endDate: task.endDate,
          priority: task.priority,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gantt-tasks"] });
    },
    onError: () => toast.error(ar ? "تحديث المهمة" : "Update task"),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formData: CreateFormData) => {
      const res = await fetch("/api/gantt", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gantt-tasks"] });
      setIsCreateDialogOpen(false);
      toast.created(ar ? "مهمة" : "Task");
    },
    onError: () => toast.error(ar ? "إنشاء المهمة" : "Create task"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/gantt?id=${id}`, { method: "DELETE", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gantt-tasks"] });
      setIsEditDialogOpen(false);
      toast.deleted(ar ? "المهمة" : "Task");
    },
    onError: () => toast.error(ar ? "حذف المهمة" : "Delete task"),
  });

  // Group tasks by phase category
  const phaseGroups = useMemo(() => {
    if (!showPhaseGroups) return { ungrouped: tasks };
    const groups: Record<string, GanttTask[]> = {};
    const order = ["ARCHITECTURAL", "STRUCTURAL", "MEP", "GOVERNMENT", "CONTRACTING"];
    tasks.forEach((task) => {
      const cat = task.phaseCategory || "OTHER";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(task);
    });
    const sorted: Record<string, GanttTask[]> = {};
    order.forEach((cat) => {
      if (groups[cat]) sorted[cat] = groups[cat];
    });
    if (groups["OTHER"]) sorted["OTHER"] = groups["OTHER"];
    return sorted;
  }, [tasks, showPhaseGroups]);

  // Flatten grouped tasks for rendering
  const flattenedTasks = useMemo(() => {
    const result: (GanttTask | { type: "phase-header"; category: string })[] = [];
    if (showPhaseGroups) {
      Object.entries(phaseGroups).forEach(([category, groupTasks]) => {
        result.push({ type: "phase-header", category } as GanttTask | { type: "phase-header"; category: string });
        groupTasks.forEach((task) => result.push(task));
      });
    } else {
      tasks.forEach((task) => result.push(task));
    }
    return result;
  }, [phaseGroups, tasks, showPhaseGroups]);

  // Calculate view range
  const viewRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    switch (viewMode) {
      case "day":
        start.setDate(start.getDate() - 7);
        end.setDate(end.getDate() + 14);
        break;
      case "week":
        start.setDate(start.getDate() - 14);
        end.setDate(end.getDate() + 42);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        end.setMonth(end.getMonth() + 3);
        break;
    }
    return { start, end };
  }, [currentDate, viewMode]);

  // Generate timeline headers with month labels
  const { timelineHeaders, monthLabels } = useMemo(() => {
    const headers: { date: Date; label: string; isToday: boolean; dayOfWeek: number }[] = [];
    const months: { label: string; startIndex: number; count: number }[] = [];
    const current = new Date(viewRange.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let lastMonth = -1;
    let monthStartIdx = 0;
    while (current <= viewRange.end) {
      const isToday = current.getTime() === today.getTime();
      const month = current.getMonth();
      if (month !== lastMonth && lastMonth !== -1) {
        months.push({
          label: current.toLocaleDateString(ar ? "ar-SA" : "en-US", { month: "short", year: "numeric" }),
          startIndex: monthStartIdx,
          count: headers.length - monthStartIdx,
        });
        monthStartIdx = headers.length;
      }
      lastMonth = month;
      headers.push({
        date: new Date(current),
        label: current.getDate().toString(),
        isToday,
        dayOfWeek: current.getDay(),
      });
      current.setDate(current.getDate() + 1);
    }
    if (monthStartIdx < headers.length) {
      const lastDate = headers[headers.length - 1].date;
      months.push({
        label: lastDate.toLocaleDateString(ar ? "ar-SA" : "en-US", { month: "short", year: "numeric" }),
        startIndex: monthStartIdx,
        count: headers.length - monthStartIdx,
      });
    }
    return { timelineHeaders: headers, monthLabels: months };
  }, [viewRange, ar]);

  // Today position
  const todayPosition = useMemo(() => {
    const todayIdx = timelineHeaders.findIndex((h) => h.isToday);
    if (todayIdx === -1) return null;
    return (todayIdx / timelineHeaders.length) * 100;
  }, [timelineHeaders]);

  // Calculate task position in timeline
  const getTaskPosition = useCallback(
    (task: GanttTask) => {
      if (!task.startDate || !task.endDate) return null;
      const totalDays = timelineHeaders.length;
      const startOffset = Math.floor((new Date(task.startDate).getTime() - viewRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const endOffset = Math.floor((new Date(task.endDate).getTime() - viewRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const left = Math.max(0, (startOffset / totalDays) * 100);
      const width = Math.min(100 - left, ((endOffset - startOffset) / totalDays) * 100);
      return { left: `${left}%`, width: `${Math.max(2, width)}%` };
    },
    [timelineHeaders, viewRange]
  );

  // Navigate timeline
  const navigateTimeline = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case "day":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
        break;
      case "week":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 14 : -14));
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  const handleTaskClick = (task: GanttTask) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  // Drag handlers
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedTask || !dragMode || !originalDates || !timelineRef.current) return;
      const timelineWidth = timelineRef.current.offsetWidth;
      const deltaX = e.clientX - dragStartX;
      const daysDelta = Math.round((deltaX / timelineWidth) * timelineHeaders.length);
      if (daysDelta === 0) return;
      const ONE_DAY = 24 * 60 * 60 * 1000;
      let newStartDate = originalDates.start;
      let newEndDate = originalDates.end;
      if (dragMode === "move") {
        if (originalDates.start) newStartDate = new Date(new Date(originalDates.start).getTime() + daysDelta * ONE_DAY).toISOString();
        if (originalDates.end) newEndDate = new Date(new Date(originalDates.end).getTime() + daysDelta * ONE_DAY).toISOString();
      } else if (dragMode === "resize-left" && originalDates.start && originalDates.end) {
        const newStart = new Date(new Date(originalDates.start).getTime() + daysDelta * ONE_DAY);
        if (newStart < new Date(originalDates.end)) newStartDate = newStart.toISOString();
      } else if (dragMode === "resize-right" && originalDates.start && originalDates.end) {
        const newEnd = new Date(new Date(originalDates.end).getTime() + daysDelta * ONE_DAY);
        if (newEnd > new Date(originalDates.start)) newEndDate = newEnd.toISOString();
      }
      setTasks((prev) => prev.map((t) => (t.id === draggedTask.id ? { ...t, startDate: newStartDate, endDate: newEndDate } : t)));
    },
    [draggedTask, dragMode, dragStartX, originalDates, timelineHeaders.length]
  );

  const handleDragEndRef = useRef<() => void>(() => {});
  const handleDragEnd = useCallback(() => {
    if (draggedTask) {
      const updatedTask = tasks.find((t) => t.id === draggedTask.id);
      if (updatedTask) updateMutation.mutate(updatedTask);
    }
    setDraggedTask(null);
    setDragMode(null);
    setOriginalDates(null);
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEndRef.current);
  }, [draggedTask, tasks, updateMutation, handleDragMove]);
  useEffect(() => { handleDragEndRef.current = handleDragEnd; }, [handleDragEnd]);

   
  const handleDragStart = (e: React.MouseEvent, task: GanttTask, mode: "move" | "resize-left" | "resize-right") => {
    e.preventDefault();
    setDraggedTask(task);
    setDragMode(mode);
    setDragStartX(e.clientX);
    setOriginalDates({ start: task.startDate, end: task.endDate });
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
  };

  // Summary stats
  const totalTasks = tasks.filter((t) => t.type === "task").length;
  const activeTasks = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "ACTIVE").length;
  const completedTasks = tasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED").length;
  const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0;

  // ===== Loading State =====
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ===== HEADER SECTION ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md shadow-teal-500/20">
            <GanttChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {ar ? "مخطط جانت" : "Gantt Chart"}
              </h2>
              <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs border-0">
                {totalTasks} {ar ? "مهمة" : "tasks"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ar ? "جدول زمني تفاعلي للمشاريع والمراحل" : "Interactive project and phase timeline"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-sm shadow-md shadow-teal-500/20 border-0 h-9 px-4"
        >
          <Plus className="h-4 w-4" />
          {ar ? "إضافة مهمة" : "Add Task"}
        </Button>
      </div>

      {/* ===== SUMMARY STAT CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-600 dark:to-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <BarChart3 className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{totalTasks}</div>
            <p className="text-[11px] text-slate-200 mt-0.5">{ar ? "إجمالي المهام" : "Total Tasks"}</p>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-teal-600 dark:to-cyan-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="flex items-center gap-0.5 text-[10px] text-teal-100">
                <Play className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{activeTasks}</div>
            <p className="text-[11px] text-teal-100 mt-0.5">{ar ? "قيد التنفيذ" : "In Progress"}</p>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <CheckCircle className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{completedTasks}</div>
            <p className="text-[11px] text-emerald-100 mt-0.5">{ar ? "مكتملة" : "Completed"}</p>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <CalendarDays className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{avgProgress}%</div>
            <p className="text-[11px] text-violet-100 mt-0.5">{ar ? "متوسط التقدم" : "Avg Progress"}</p>
          </div>
        </Card>
      </div>

      {/* ===== GANTT CHART ===== */}
      <Card className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-0">
          {/* Controls Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mobile View Toggle (list/gantt) — only visible on small screens */}
                <div className="flex items-center md:hidden bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setMobileView("list")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      mobileView === "list"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                    aria-label={ar ? "عرض القائمة" : "List view"}
                  >
                    <List className="w-3.5 h-3.5" />
                    {ar ? "قائمة" : "List"}
                  </button>
                  <button
                    onClick={() => setMobileView("gantt")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      mobileView === "gantt"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                    aria-label={ar ? "عرض جانت" : "Gantt view"}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    {ar ? "جانت" : "Gantt"}
                  </button>
                </div>

                {/* Phase Group Toggle */}
                <Button
                  variant={showPhaseGroups ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs border-0",
                    showPhaseGroups
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}
                  onClick={() => setShowPhaseGroups(!showPhaseGroups)}
                >
                  <Layers className="w-3.5 h-3.5 me-1.5" />
                  {ar ? "بمراحل" : "Phased"}
                </Button>

                {/* View Mode Toggle — hidden on mobile when in list view */}
                <div className={cn(
                  "flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700",
                  isMobile && mobileView === "list" && "hidden"
                )}>
                  {(["day", "week", "month"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                        viewMode === mode
                          ? "bg-teal-600 text-white shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
                    >
                      {mode === "day" ? (ar ? "يوم" : "Day") : mode === "week" ? (ar ? "أسبوع" : "Week") : ar ? "شهر" : "Month"}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn(
                "flex items-center gap-1",
                isMobile && mobileView === "list" && "hidden"
              )}>
                {/* Navigation */}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateTimeline("prev")} aria-label="Previous">
                  {ar ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>
                  {ar ? "اليوم" : "Today"}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateTimeline("next")} aria-label="Next">
                  {ar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile List View */}
          {isMobile && mobileView === "list" && (
            <div className="p-3">
              <GanttMobileView
                tasks={tasks}
                ar={ar}
                onTaskClick={handleTaskClick}
              />
            </div>
          )}

          {/* Gantt Body — hidden on mobile when in list view */}
          <div className={cn("flex", isMobile && mobileView === "list" && "hidden")}>
            {/* Task List Sidebar — hidden on mobile */}
            <div className="w-72 border-e border-slate-200 dark:border-slate-700/50 flex-shrink-0 bg-white dark:bg-slate-900 hidden md:block">
              <div className="h-10 border-b border-slate-200 dark:border-slate-700/50 flex items-center px-3 bg-slate-50 dark:bg-slate-800/30">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {ar ? "المهمة" : "Task"}
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {flattenedTasks.map((item) => {
                  if ((item as { type: string }).type === "phase-header") {
                    const category = (item as { type: string; category: string }).category;
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
                      onClick={() => handleTaskClick(task)}
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

            {/* Timeline Area — scrollable with touch support on mobile */}
            <div
              className="flex-1 overflow-x-auto"
              ref={timelineRef}
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {/* Month labels row */}
              <div className="h-7 border-b border-slate-200 dark:border-slate-700/50 flex bg-slate-50 dark:bg-slate-800/30 sticky top-0 z-20">
                {monthLabels.map((ml, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 h-7 flex items-center px-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 border-e border-slate-200/50 dark:border-slate-700/30"
                    style={{ width: `${(ml.count / timelineHeaders.length) * 100}%` }}
                  >
                    {ml.label}
                  </div>
                ))}
              </div>

              {/* Day headers row */}
              <div className="h-8 border-b border-slate-200 dark:border-slate-700/50 flex bg-white dark:bg-slate-900 sticky top-7 z-20">
                {timelineHeaders.map((header, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex-shrink-0 w-10 h-8 flex flex-col items-center justify-center text-[10px] border-e border-slate-100 dark:border-slate-800/30 last:border-e-0",
                      (header.dayOfWeek === 5 || header.dayOfWeek === 6) && "bg-slate-50/80 dark:bg-slate-800/20",
                      header.isToday && "bg-teal-50 dark:bg-teal-900/20"
                    )}
                  >
                    <span className={cn(header.isToday ? "text-teal-600 dark:text-teal-400 font-bold" : "text-slate-400 dark:text-slate-500")}>
                      {header.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Task Bars + Today Line */}
              <div className="relative">
                {/* Today Line */}
                {todayPosition !== null && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-teal-500 z-10 pointer-events-none" style={{ left: `${todayPosition}%` }}>
                    <div className="absolute -top-5 -translate-x-1/2 bg-teal-500 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm">
                      {ar ? "اليوم" : "Today"}
                    </div>
                  </div>
                )}

                {/* Task Rows */}
                {flattenedTasks.map((item) => {
                  if ((item as { type: string }).type === "phase-header") {
                    return (
                      <div key={`phase-bar-${(item as { category: string }).category}`} className="h-9 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/10" />
                    );
                  }

                  const task = item as GanttTask;
                  const position = getTaskPosition(task);
                  const isBeingDragged = draggedTask?.id === task.id;
                  const barColor = getBarColor(task);

                  return (
                    <div key={task.id} className="h-11 border-b border-slate-100 dark:border-slate-800/50 relative">
                      {position && (
                        <div
                          className={cn(
                            "absolute top-1.5 h-8 rounded-lg flex items-center group shadow-sm",
                            isBeingDragged && "ring-2 ring-teal-400 ring-opacity-50"
                          )}
                          style={{
                            left: position.left,
                            width: position.width,
                            backgroundColor: barColor,
                            cursor: dragMode === "move" ? "grabbing" : "grab",
                            opacity: task.status === "CANCELLED" ? 0.5 : 1,
                          }}
                        >
                          {/* Left Resize Handle */}
                          <div
                            className="absolute start-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-s-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, task, "resize-left");
                            }}
                          >
                            <GripHorizontal className="w-3 h-3 text-white/60" />
                          </div>

                          {/* Progress Fill */}
                          <div className="h-full rounded-s-lg" style={{ width: `${task.progress}%`, backgroundColor: "rgba(255,255,255,0.25)" }} />

                          {/* Task Title */}
                          <div
                            className="flex-1 px-2 cursor-grab min-w-0"
                            onMouseDown={(e) => handleDragStart(e, task, "move")}
                            onClick={() => !draggedTask && handleTaskClick(task)}
                          >
                            <span className="text-[10px] text-white truncate block font-medium">{task.title}</span>
                          </div>

                          {/* Right Resize Handle */}
                          <div
                            className="absolute end-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-e-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, task, "resize-right");
                            }}
                          >
                            <GripHorizontal className="w-3 h-3 text-white/60" />
                          </div>
                        </div>
                      )}

                      {/* Milestone Diamond */}
                      {task.isMilestone && task.endDate && (() => {
                        const endDateOffset = Math.floor((new Date(task.endDate).getTime() - viewRange.start.getTime()) / (1000 * 60 * 60 * 24));
                        const milestonePct = (endDateOffset / timelineHeaders.length) * 100;
                        if (milestonePct < 0 || milestonePct > 100) return null;
                        return (
                          <div className="absolute top-2.5 z-[6] pointer-events-none" style={{ left: `${milestonePct}%` }}>
                            <div className="w-5 h-5 transform rotate-45 bg-amber-500 border-2 border-amber-300 shadow-lg shadow-amber-500/30" />
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center gap-4 flex-wrap text-xs bg-slate-50 dark:bg-slate-800/30">
            <span className="text-slate-400 dark:text-slate-500">{ar ? "الحالة:" : "Status:"}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-teal-500" />
              <span className="text-slate-500 dark:text-slate-400">{ar ? "قيد التنفيذ" : "In Progress"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400">{ar ? "مكتمل" : "Completed"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-slate-500 dark:text-slate-400">{ar ? "متأخر" : "Delayed"}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>
            <div className="flex items-center gap-1.5">
              <Diamond className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-slate-500 dark:text-slate-400">{ar ? "معلم" : "Milestone"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-teal-500" />
              <span className="text-slate-500 dark:text-slate-400">{ar ? "اليوم" : "Today"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== EDIT TASK DIALOG ===== */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ar ? "تعديل المهمة" : "Edit Task"}</DialogTitle>
            <DialogDescription>{ar ? "تعديل تفاصيل المهمة في الجدول الزمني" : "Edit task details in the timeline"}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label>{ar ? "العنوان" : "Title"}</Label>
                <Input
                  value={selectedTask.title}
                  onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{ar ? "تاريخ البداية" : "Start Date"}</Label>
                  <Input
                    type="date"
                    value={selectedTask.startDate?.split("T")[0] || ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, startDate: e.target.value || null })}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label>{ar ? "تاريخ النهاية" : "End Date"}</Label>
                  <Input
                    type="date"
                    value={selectedTask.endDate?.split("T")[0] || ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, endDate: e.target.value || null })}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{ar ? "التقدم" : "Progress"} (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedTask.progress}
                    onChange={(e) => setSelectedTask({ ...selectedTask, progress: parseInt(e.target.value) || 0 })}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label>{ar ? "الحالة" : "Status"}</Label>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(value) => setSelectedTask({ ...selectedTask, status: value })}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {ar ? label.ar : label.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => selectedTask && deleteMutation.mutate(selectedTask.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Trash2 className="w-4 h-4 me-1" />}
              {ar ? "حذف" : "Delete"}
            </Button>
            <Button
              onClick={() => {
                if (selectedTask) {
                  updateMutation.mutate(selectedTask);
                  setIsEditDialogOpen(false);
                }
              }}
              disabled={updateMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white border-0"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : null}
              {ar ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CREATE TASK DIALOG ===== */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ar ? "إضافة مهمة جديدة" : "Add New Task"}</DialogTitle>
            <DialogDescription>{ar ? "أدخل تفاصيل المهمة للجدول الزمني" : "Enter task details for the timeline"}</DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            ar={ar}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Create Task Form =====
interface CreateFormData {
  title: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  priority?: string;
}

function CreateTaskForm({
  ar,
  onSubmit,
  onCancel,
  isLoading,
}: {
  ar: boolean;
  onSubmit: (data: CreateFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("NORMAL");

  const handleSubmit = () => {
    onSubmit({
      title,
      startDate: startDate || null,
      endDate: endDate || null,
      priority,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{ar ? "العنوان" : "Title"} *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={ar ? "عنوان المهمة" : "Task title"}
          className="bg-slate-50 dark:bg-slate-800"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{ar ? "تاريخ البداية" : "Start Date"}</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800" />
        </div>
        <div>
          <Label>{ar ? "تاريخ النهاية" : "End Date"}</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800" />
        </div>
      </div>
      <div>
        <Label>{ar ? "الأولوية" : "Priority"}</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">{ar ? "منخفضة" : "Low"}</SelectItem>
            <SelectItem value="NORMAL">{ar ? "عادية" : "Normal"}</SelectItem>
            <SelectItem value="HIGH">{ar ? "عالية" : "High"}</SelectItem>
            <SelectItem value="URGENT">{ar ? "حرجة" : "Urgent"}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {ar ? "إلغاء" : "Cancel"}
        </Button>
        <Button onClick={handleSubmit} disabled={!title || isLoading} className="bg-teal-600 hover:bg-teal-700 text-white border-0">
          {isLoading ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Plus className="w-4 h-4 me-1" />}
          {ar ? "إضافة" : "Add"}
        </Button>
      </DialogFooter>
    </div>
  );
}
