"use client";


import { useTranslations } from 'next-intl';
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Calendar, Clock, ListChecks, Building2, MoreHorizontal, Trash2, GripVertical, Landmark, LayoutList, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import {
  type TaskItem,
  COLUMNS,
  getColumnLabel,
  getPriorityConfig,
} from "./types";

// ===== Task Actions Dropdown =====
function TaskActionsDropdown({ taskId, taskTitle, ar, onOpenComments }: { taskId: string; taskTitle: string; ar: boolean; onOpenComments?: () => void }) {
  const tAuto = useTranslations();
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: getMutationHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(data.error, 'Failed to delete task'));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.deleted(tAuto('auto.task'));
    },
    onError: (error: Error) => {
      toast.showError(ar ? `فشل في حذف المهمة: ${error.message}` : `Failed to delete task: ${error.message}`);
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="More options">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={ar ? "start" : "end"} className="w-40">
        {onOpenComments && (
          <DropdownMenuItem
            className="text-brand-navy-600 dark:text-brand-navy-400 focus:text-brand-navy-600"
            onClick={() => onOpenComments()}
          >
            <MessageSquare className="h-3.5 w-3.5 me-2" />
            {tAuto('auto.comments')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-red-600 dark:text-red-400 focus:text-red-600"
          onClick={() => {
            if (confirm(ar ? `هل أنت متأكد من حذف "${taskTitle}"؟` : `Delete "${taskTitle}"?`)) {
              deleteMutation.mutate();
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5 me-2" />
          {tAuto('auto.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ===== Sortable Task Card =====
function SortableTaskCard({ task, ar, bulkMode, selected, onToggle, onOpenComments }: { task: TaskItem; ar: boolean; bulkMode?: boolean; selected?: boolean; onToggle?: (id: string) => void; onOpenComments?: (task: TaskItem) => void }) {
  const tAuto = useTranslations();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const priorityConfig = getPriorityConfig(task.priority);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const now = new Date();
  const isApproaching = dueDate
    ? dueDate.getTime() - now.getTime() < 2 * 86400000 && dueDate.getTime() > now.getTime()
    : false;
  const isOverdue = dueDate ? dueDate.getTime() < now.getTime() : false;

  // SLA calculation
  let slaRemaining: number | null = null;
  let slaOverdue = false;
  let slaApproaching = false;
  if ((task.taskType === 'GOVERNMENTAL' || task.taskType === 'MANDATORY') && task.slaDays && task.startDate) {
    const start = new Date(task.startDate);
    const deadline = new Date(start.getTime() + task.slaDays * 86400000);
    const diff = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
    slaRemaining = diff;
    slaOverdue = diff < 0;
    slaApproaching = diff >= 0 && diff < 3;
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={() => !bulkMode && onOpenComments?.(task)}
      className={cn(
        "py-0 gap-0 border-slate-200/70 dark:border-slate-700/40 bg-white dark:bg-slate-900/80 backdrop-blur-sm",
        "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer group",
        "border-s-3",
        priorityConfig.leftBorder,
        priorityConfig.gradient || "bg-white dark:bg-slate-900/80",
        "rounded-lg",
        bulkMode && selected && "ring-2 ring-brand-navy-400 ring-offset-1 dark:ring-offset-slate-900"
      )}
    >
      <div className="p-3">
        {/* Bulk checkbox */}
        {bulkMode && (
          <div className="absolute top-2 start-2 z-10">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggle?.(task.id)}
              className="data-[state=checked]:bg-brand-navy-500 data-[state=checked]:border-brand-navy-500 h-4 w-4"
            />
          </div>
        )}
        {/* Top: Priority + Government + Actions */}
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 rounded-md font-semibold", priorityConfig.color)}>
            {ar ? priorityConfig.label : priorityConfig.labelEn}
          </Badge>
          {(task.taskType === 'GOVERNMENTAL' || task.taskType === 'MANDATORY') && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] h-5 px-1.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium",
                slaApproaching && !slaOverdue && "animate-pulse"
              )}
            >
              <Landmark className="h-3 w-3 me-1" />
              {tAuto('auto.gov')}
              {slaApproaching && !slaOverdue && (
                <Clock className="h-2.5 w-2.5 ms-1" />
              )}
            </Badge>
          )}
          <div className="flex-1" />
          <button
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-md text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 dark:hover:text-brand-navy-400 dark:hover:bg-brand-navy-900/30 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <TaskActionsDropdown taskId={task.id} taskTitle={task.title} ar={ar} onOpenComments={() => onOpenComments?.(task)} />
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2 leading-relaxed">
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
            {task.description}
          </p>
        )}

        {/* Progress bar */}
        {task.progress > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-slate-400">{tAuto('auto.progress')}</span>
              <span className="text-[10px] text-slate-400 font-medium">{Math.round(task.progress)}%</span>
            </div>
            <Progress value={task.progress} className="h-1.5" />
          </div>
        )}

        {/* Subtasks count */}
        {task._count && task._count.subtasks > 0 && (
          <div className="flex items-center gap-1 mb-2 text-xs text-slate-500 dark:text-slate-400">
            <ListChecks className="h-3 w-3" />
            <span>{task._count.completedSubtasks}/{task._count.subtasks}</span>
          </div>
        )}

        {/* Comment count badge */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments?.(task);
          }}
          className={cn(
            "inline-flex items-center gap-1 mb-2 text-xs rounded-full px-2 py-0.5 transition-colors",
            (task.commentCount ?? 0) > 0
              ? "text-brand-navy-600 dark:text-brand-navy-400 bg-brand-navy-50 dark:bg-brand-navy-900/20 hover:bg-brand-navy-100 dark:hover:bg-brand-navy-900/30"
              : "text-slate-400 dark:text-slate-500 hover:text-brand-navy-500 dark:hover:text-brand-navy-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <MessageSquare className="h-3 w-3" />
          <span>{task.commentCount ?? 0}</span>
        </button>

        {/* Due date */}
        {dueDate && (
          <div className={cn(
            "flex items-center gap-1 text-xs mb-2",
            isOverdue
              ? "text-red-600 dark:text-red-400 font-medium"
              : isApproaching
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-500 dark:text-slate-400"
          )}>
            <Calendar className="h-3 w-3" />
            <span>{dueDate.toLocaleDateString(ar ? "ar-AE" : "en-US")}</span>
            {isOverdue && (
              <span className="font-semibold">({tAuto('auto.overdue1')})</span>
            )}
            {isApproaching && !isOverdue && (
              <span className="text-amber-500 font-medium">({tAuto('auto.soon')})</span>
            )}
          </div>
        )}

        {/* SLA Warning */}
        {slaRemaining !== null && (
          <div className={cn(
            "flex items-center gap-1 text-xs mb-2",
            slaOverdue
              ? "text-red-600 dark:text-red-400"
              : slaApproaching
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-500 dark:text-slate-400"
          )}>
            <Clock className={cn("h-3 w-3", slaApproaching && !slaOverdue && "animate-pulse")} />
            {slaOverdue ? (
              <span className="font-medium">{ar ? `تجاوز بـ ${Math.abs(slaRemaining)} يوم` : `Overdue by ${Math.abs(slaRemaining)} days`}</span>
            ) : (
              <span>{ar ? `${slaRemaining} يوم متبقي SLA` : `${slaRemaining} days SLA left`}</span>
            )}
            {slaOverdue && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1 ms-1">
                {tAuto('auto.overdue1')}
              </Badge>
            )}
          </div>
        )}

        <Separator className="my-2" />

        {/* Bottom: Assignee + Project */}
        <div className="flex items-center justify-between">
          {task.assignee ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatar} />
                <AvatarFallback className="text-[8px] bg-brand-navy-100 dark:bg-brand-navy-900 text-brand-navy-700 dark:text-brand-navy-300">
                  {task.assignee.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                {task.assignee.name}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400">{tAuto('auto.unassigned')}</div>
          )}
          {task.project && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{ar ? task.project.name : task.project.nameEn || task.project.name}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ===== Droppable Column =====
export function DroppableColumn({
  id, tasks, activeId, ar, onAddTask, bulkMode, selectedIds, onToggleSelect, onToggleSelectAll, onOpenComments
}: {
  id: string; tasks: TaskItem[]; activeId: string | null; ar: boolean; onAddTask: (status: string) => void; bulkMode?: boolean; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void; onToggleSelectAll?: () => void; onOpenComments?: (task: TaskItem) => void;
}) {
  const tAuto = useTranslations();
  const col = COLUMNS.find((c) => c.id === id)!;
  const { setNodeRef, isOver } = useDroppable({ id });
  const taskCount = tasks.filter((t) => t.id !== activeId).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[300px] md:w-[320px] rounded-xl border-t-4 border transition-all duration-300",
        col.borderAccent,
        col.bg,
        col.border,
        "shadow-sm",
        isOver && "ring-2 ring-brand-navy-400/50 scale-[1.01] shadow-lg shadow-brand-navy-500/10"
      )}
    >
      {/* Column Header with gradient accent */}
      <div className={cn("flex items-center gap-2 px-3 py-3 rounded-t-[9px]", col.headerBg)}>
        {bulkMode && (
          <button
            onClick={onToggleSelectAll}
            className="h-5 w-5 rounded-md flex items-center justify-center text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 dark:hover:bg-brand-navy-900/30 transition-colors"
          >
            <Checkbox
              checked={tasks.length > 0 && tasks.every((t) => selectedIds?.has(t.id))}
              onCheckedChange={onToggleSelectAll}
              className="data-[state=checked]:bg-brand-navy-500 data-[state=checked]:border-brand-navy-500"
            />
          </button>
        )}
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex-1">
          {getColumnLabel(id, ar)}
        </h3>
        <Badge
          variant="secondary"
          className="text-[10px] h-5 min-w-[20px] justify-center bg-white/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 backdrop-blur-sm font-semibold"
        >
          {taskCount}
        </Badge>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onAddTask(id)}
                className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-100 dark:hover:bg-brand-navy-900/40 transition-all duration-200 hover:scale-110"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {ar ? `إضافة مهمة إلى "${getColumnLabel(id, ar)}"` : `Add task to "${getColumnLabel(id, ar)}"`}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Separator />

      {/* Column Tasks */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} ar={ar} bulkMode={bulkMode} selected={selectedIds?.has(task.id) || false} onToggle={onToggleSelect} onOpenComments={onOpenComments} />
          ))}
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 text-xs text-slate-400 dark:text-slate-500 gap-2 opacity-60">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <LayoutList className="h-5 w-5" />
              </div>
              <span className="font-medium">{tAuto('auto.noTasks')}</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ===== Drag Overlay Card =====
export function TaskCardOverlay({ task, ar }: { task: TaskItem; ar: boolean }) {
  const tAuto = useTranslations();
  const priorityConfig = getPriorityConfig(task.priority);
  return (
    <Card className={cn("py-0 gap-0 border-slate-200/70 dark:border-slate-700/40 bg-white dark:bg-slate-900/95 shadow-2xl rotate-2 w-[300px] rounded-lg border-s-3", priorityConfig.leftBorder, priorityConfig.gradient || "bg-white dark:bg-slate-900/95")}>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 rounded-md font-semibold", priorityConfig.color)}>
            {ar ? priorityConfig.label : priorityConfig.labelEn}
          </Badge>
          {(task.taskType === 'GOVERNMENTAL' || task.taskType === 'MANDATORY') && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Landmark className="h-3 w-3 me-1" />
              {tAuto('auto.gov')}
            </Badge>
          )}
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
            {task.description}
          </p>
        )}
      </div>
    </Card>
  );
}
