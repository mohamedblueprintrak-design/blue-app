"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, type DragOverEvent } from "@dnd-kit/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";

import { type TaskItem, type TasksKanbanProps, COLUMNS } from "./types";
import { TaskFilters } from "./task-filters";
import { DroppableColumn, TaskCardOverlay } from "./task-kanban";
import { TaskForm } from "./task-form";
import { TaskDetail } from "./task-detail";
import { BulkActionBar } from "./task-stats";

export default function TasksKanban({ language, projectId }: TasksKanbanProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  // ===== State =====
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [commentTask, setCommentTask] = useState<TaskItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [defaultStatus, setDefaultStatus] = useState<string>("TODO");

  // Sync filterProject when projectId prop changes (React-recommended pattern)
  const [prevProjectId, setPrevProjectId] = useState(projectId);
  if (projectId !== prevProjectId) {
    setFilterProject(projectId || "all");
    setPrevProjectId(projectId);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ===== Data Fetching =====
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", projectId, filterProject, filterAssignee],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      if (filterAssignee !== "all") params.set("assigneeId", filterAssignee);
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.tasks || json;
    },
  });
  const tasks = useMemo(() => Array.isArray(tasksData) ? tasksData : [], [tasksData]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch("/api/users-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // ===== Mutations =====
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PUT", headers: getMutationHeaders(), body: JSON.stringify({ status }) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(extractErrorMessage(data.error, 'Failed to update task status')); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (error: Error) => { toast.showError(ar ? `فشل في تحديث حالة المهمة: ${error.message}` : `Failed to update task status: ${error.message}`); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => fetch(`/api/tasks/${id}`, { method: "DELETE", headers: getMutationHeaders() })));
      const failed = results.find((r) => !r.ok);
      if (failed) { const data = await failed.json().catch(() => ({})); throw new Error(extractErrorMessage(data.error, 'Failed to delete some tasks')); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setSelectedIds(new Set()); toast.deleted(ar ? "المهام المحددة" : "Selected tasks"); },
    onError: (error: Error) => { toast.showError(ar ? `فشل في حذف المهام: ${error.message}` : `Failed to delete tasks: ${error.message}`); },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const results = await Promise.all(ids.map((id) => fetch(`/api/tasks/${id}`, { method: "PUT", headers: getMutationHeaders(), body: JSON.stringify({ status }) })));
      const failed = results.find((r) => !r.ok);
      if (failed) { const data = await failed.json().catch(() => ({})); throw new Error(extractErrorMessage(data.error, 'Failed to change status of some tasks')); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setSelectedIds(new Set()); toast.showSuccess(ar ? "تم تغيير حالة المهام" : "Task status changed"); },
    onError: (error: Error) => { toast.showError(ar ? `فشل في تغيير الحالة: ${error.message}` : `Failed to change status: ${error.message}`); },
  });

  const bulkPriorityMutation = useMutation({
    mutationFn: async ({ ids, priority }: { ids: string[]; priority: string }) => {
      const results = await Promise.all(ids.map((id) => fetch(`/api/tasks/${id}`, { method: "PUT", headers: getMutationHeaders(), body: JSON.stringify({ priority }) })));
      const failed = results.find((r) => !r.ok);
      if (failed) { const data = await failed.json().catch(() => ({})); throw new Error(extractErrorMessage(data.error, 'Failed to change priority of some tasks')); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setSelectedIds(new Set()); toast.showSuccess(ar ? "تم تغيير أولوية المهام" : "Task priority changed"); },
    onError: (error: Error) => { toast.showError(ar ? `فشل في تغيير الأولوية: ${error.message}` : `Failed to change priority: ${error.message}`); },
  });

  // ===== Bulk Select Helpers =====
  const toggleBulkSelect = (taskId: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(taskId)) next.delete(taskId); else next.add(taskId); return next; });
  };

  const toggleSelectAllInColumn = (status: string) => {
    const columnTasks = filteredTasks.filter((t) => t.status === status);
    const allSelected = columnTasks.every((t) => selectedIds.has(t.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { columnTasks.forEach((t) => next.delete(t.id)); } else { columnTasks.forEach((t) => next.add(t.id)); }
      return next;
    });
  };

  const exitBulkMode = () => { setBulkMode(false); setSelectedIds(new Set()); };

  // ===== Drag Handlers =====
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    setActiveTask(tasks.find((t) => t.id === id) || null);
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);
    if (!over) return;
    const taskId = String(active.id);
    const currentTask = tasks.find((t) => t.id === taskId);
    const targetColumn = COLUMNS.find((c) => c.id === over.id);
    if (targetColumn) {
      if (currentTask && currentTask.status !== targetColumn.id) {
        updateStatusMutation.mutate({ id: taskId, status: targetColumn.id });
      }
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask && currentTask && currentTask.status !== overTask.status) {
        updateStatusMutation.mutate({ id: taskId, status: overTask.status });
      }
    }
  }, [tasks, updateStatusMutation]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active: _active, over } = event;
    if (!over) return;
  }, []);

  // ===== Other Handlers =====
  const handleAddTask = (status: string) => {
    setDefaultStatus(status);
    setShowAddDialog(true);
  };

  const handleOpenComments = (task: TaskItem) => { setCommentTask(task); };

  // ===== Quick Filter Logic =====
  const now = new Date();
  const getQuickFilteredTasks = () => {
    switch (quickFilter) {
      case "URGENT": return tasks.filter((t) => t.priority === "URGENT");
      case "OVERDUE": return tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
      case "governmental": return tasks.filter((t) => t.taskType === "GOVERNMENTAL" || t.taskType === "MANDATORY");
      default: return tasks;
    }
  };
  const filteredTasks = getQuickFilteredTasks();

  // Group tasks by status
  const tasksByStatus: Record<string, TaskItem[]> = {};
  COLUMNS.forEach((col) => {
    tasksByStatus[col.id] = filteredTasks.filter((t) => t.status === col.id);
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Header & Filters */}
        <TaskFilters
          ar={ar}
          projectId={projectId}
          tasks={tasks}
          quickFilter={quickFilter}
          setQuickFilter={setQuickFilter}
          filterProject={filterProject}
          setFilterProject={setFilterProject}
          filterAssignee={filterAssignee}
          setFilterAssignee={setFilterAssignee}
          projects={projects}
          users={users}
          bulkMode={bulkMode}
          onExitBulkMode={exitBulkMode}
          onEnterBulkMode={() => setBulkMode(true)}
          onAddTask={() => handleAddTask("TODO")}
        />

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            {ar ? "جارٍ التحميل..." : "Loading..."}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {COLUMNS.map((col) => (
                <DroppableColumn
                  key={col.id}
                  id={col.id}
                  tasks={tasksByStatus[col.id]}
                  activeId={activeId}
                  ar={ar}
                  onAddTask={handleAddTask}
                  bulkMode={bulkMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleBulkSelect}
                  onToggleSelectAll={() => toggleSelectAllInColumn(col.id)}
                  onOpenComments={handleOpenComments}
                />
              ))}
            </div>

            {/* Floating Bulk Action Bar */}
            {bulkMode && selectedIds.size > 0 && (
              <BulkActionBar
                ar={ar}
                selectedCount={selectedIds.size}
                onBulkStatusChange={(val) => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: val })}
                onBulkPriorityChange={(val) => bulkPriorityMutation.mutate({ ids: Array.from(selectedIds), priority: val })}
                onBulkDelete={() => {
                  if (confirm(ar ? `حذف ${selectedIds.size} مهمة؟` : `Delete ${selectedIds.size} tasks?`)) {
                    bulkDeleteMutation.mutate(Array.from(selectedIds));
                  }
                }}
                onClearSelection={() => setSelectedIds(new Set())}
                isBulkStatusPending={bulkStatusMutation.isPending}
                isBulkPriorityPending={bulkPriorityMutation.isPending}
                isBulkDeletePending={bulkDeleteMutation.isPending}
              />
            )}

            <DragOverlay>
              {activeTask && <TaskCardOverlay task={activeTask} ar={ar} />}
            </DragOverlay>
          </DndContext>
        )}

        {/* Add Task Dialog */}
        <TaskForm
          ar={ar}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          defaultStatus={defaultStatus}
          projectId={projectId}
          projects={projects}
          users={users}
        />

        {/* Task Detail + Comments Sheet */}
        <TaskDetail
          ar={ar}
          language={language}
          commentTask={commentTask}
          onClose={() => setCommentTask(null)}
        />
      </div>
    </TooltipProvider>
  );
}
