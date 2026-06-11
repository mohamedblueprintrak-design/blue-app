"use client";

/**
 * Gantt Chart Page - Full-featured project scheduling timeline
 * مخطط جانت - جدول زمني متكامل للمشاريع
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Plus, GanttChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { GanttMobileView } from "@/components/pages/gantt-mobile-view";
import { CreateTaskForm, CreateFormData } from "@/components/gantt/create-task-form";
import { GanttTask, FlattenedItem } from "@/components/gantt/gantt-types";
import { TaskDetailPanel } from "@/components/gantt/task-detail-panel";
import { GanttToolbar } from "@/components/gantt/gantt-toolbar";
import { GanttTaskList } from "@/components/gantt/gantt-task-list";
import { GanttSummaryCards } from "@/components/gantt/gantt-summary-cards";
import { GanttTimeline } from "@/components/gantt/gantt-timeline";
import { GanttLegend } from "@/components/gantt/gantt-legend";
import { useGanttDrag } from "@/components/gantt/use-gantt-drag";

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

  // Sync tasks from query data (useMemo + ref to avoid setState-in-effect lint error)
  const queryTasks = useMemo(() => data?.data ?? [], [data?.data]);
  const prevQueryTasksRef = useRef<typeof queryTasks>([]);
  if (queryTasks !== prevQueryTasksRef.current) {
    prevQueryTasksRef.current = queryTasks;
    // Schedule state update outside of render cycle
    queueMicrotask(() => setTasks(queryTasks));
  }

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (task: GanttTask) => {
      const res = await fetch("/api/gantt", {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          id: task.id, title: task.title, status: task.status,
          progress: task.progress, startDate: task.startDate,
          endDate: task.endDate, priority: task.priority,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gantt-tasks"] }),
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
    order.forEach((cat) => { if (groups[cat]) sorted[cat] = groups[cat]; });
    if (groups["OTHER"]) sorted["OTHER"] = groups["OTHER"];
    return sorted;
  }, [tasks, showPhaseGroups]);

  // Flatten grouped tasks for rendering
  const flattenedTasks = useMemo((): FlattenedItem[] => {
    const result: FlattenedItem[] = [];
    if (showPhaseGroups) {
      Object.entries(phaseGroups).forEach(([category, groupTasks]) => {
        result.push({ type: "phase-header", category });
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
      case "day": start.setDate(start.getDate() - 7); end.setDate(end.getDate() + 14); break;
      case "week": start.setDate(start.getDate() - 14); end.setDate(end.getDate() + 42); break;
      case "month": start.setMonth(start.getMonth() - 1); end.setMonth(end.getMonth() + 3); break;
    }
    return { start, end };
  }, [currentDate, viewMode]);

  // Generate timeline headers with month labels
  const { timelineHeaders, monthLabels } = useMemo(() => {
    const headers: { date: Date; label: string; isToday: boolean; dayOfWeek: number }[] = [];
    const months: { label: string; startIndex: number; count: number }[] = [];
    const current = new Date(viewRange.start);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let lastMonth = -1; let monthStartIdx = 0;
    while (current <= viewRange.end) {
      const isToday = current.getTime() === today.getTime();
      const month = current.getMonth();
      if (month !== lastMonth && lastMonth !== -1) {
        months.push({
          label: current.toLocaleDateString(ar ? "ar-SA" : "en-US", { month: "short", year: "numeric" }),
          startIndex: monthStartIdx, count: headers.length - monthStartIdx,
        });
        monthStartIdx = headers.length;
      }
      lastMonth = month;
      headers.push({ date: new Date(current), label: current.getDate().toString(), isToday, dayOfWeek: current.getDay() });
      current.setDate(current.getDate() + 1);
    }
    if (monthStartIdx < headers.length) {
      const lastDate = headers[headers.length - 1].date;
      months.push({
        label: lastDate.toLocaleDateString(ar ? "ar-SA" : "en-US", { month: "short", year: "numeric" }),
        startIndex: monthStartIdx, count: headers.length - monthStartIdx,
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
      case "day": newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7)); break;
      case "week": newDate.setDate(newDate.getDate() + (direction === "next" ? 14 : -14)); break;
      case "month": newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1)); break;
    }
    setCurrentDate(newDate);
  };

  const handleTaskClick = (task: GanttTask) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  // Drag hook
  const { draggedTask, dragMode, handleDragStart } = useGanttDrag({
    tasks,
    setTasks,
    timelineHeadersLength: timelineHeaders.length,
    timelineRef,
    onUpdateTask: (task) => updateMutation.mutate(task),
  });

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
      <GanttSummaryCards ar={ar} totalTasks={totalTasks} activeTasks={activeTasks} completedTasks={completedTasks} avgProgress={avgProgress} />

      {/* ===== GANTT CHART ===== */}
      <Card className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-0">
          <GanttToolbar
            ar={ar} viewMode={viewMode} onViewModeChange={setViewMode}
            showPhaseGroups={showPhaseGroups} onShowPhaseGroupsChange={setShowPhaseGroups}
            mobileView={mobileView} onMobileViewChange={setMobileView}
            isMobile={isMobile}
            onNavigatePrev={() => navigateTimeline("prev")}
            onNavigateNext={() => navigateTimeline("next")}
            onToday={() => setCurrentDate(new Date())}
          />

          {/* Mobile List View */}
          {isMobile && mobileView === "list" && (
            <div className="p-3">
              <GanttMobileView tasks={tasks} ar={ar} onTaskClick={handleTaskClick} />
            </div>
          )}

          {/* Gantt Body */}
          <div className={cn("flex", isMobile && mobileView === "list" && "hidden")}>
            <GanttTaskList ar={ar} flattenedItems={flattenedTasks} phaseGroups={phaseGroups} onTaskClick={handleTaskClick} />
            <GanttTimeline
              ar={ar} timelineHeaders={timelineHeaders} monthLabels={monthLabels}
              todayPosition={todayPosition} flattenedItems={flattenedTasks}
              getTaskPosition={getTaskPosition} viewRange={viewRange}
              draggedTask={draggedTask} dragMode={dragMode}
              onDragStart={handleDragStart} onTaskClick={handleTaskClick}
              timelineRef={timelineRef}
            />
          </div>

          <GanttLegend ar={ar} />
        </CardContent>
      </Card>

      {/* ===== EDIT TASK DIALOG ===== */}
      <TaskDetailPanel
        ar={ar} isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}
        selectedTask={selectedTask} onSelectedTaskChange={setSelectedTask}
        onDelete={(id) => deleteMutation.mutate(id)}
        onSave={(task) => { updateMutation.mutate(task); setIsEditDialogOpen(false); }}
        isDeleting={deleteMutation.isPending} isSaving={updateMutation.isPending}
      />

      {/* ===== CREATE TASK DIALOG ===== */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ar ? "إضافة مهمة جديدة" : "Add New Task"}</DialogTitle>
            <DialogDescription>{ar ? "أدخل تفاصيل المهمة للجدول الزمني" : "Enter task details for the timeline"}</DialogDescription>
          </DialogHeader>
          <CreateTaskForm ar={ar} onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setIsCreateDialogOpen(false)} isLoading={createMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
