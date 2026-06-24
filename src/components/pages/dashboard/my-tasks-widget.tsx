"use client";


import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useNavStore } from "@/store/nav-store";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ListTodo,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import type { MyTaskItem } from "./types";

export function MyTasksWidget({ language }: { language: "ar" | "en" }) {
  const tAuto = useTranslations();
  const isAr = language === "ar";
  const { user } = useAuthStore();
  const { setCurrentPage } = useNavStore();
  const queryClient = useQueryClient();

  const { data: apiTasks, isError: _isError } = useQuery<MyTaskItem[]>({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams();
      params.set("assigneeId", user.id);
      params.set("status", "TODO,IN_PROGRESS");
      params.set("limit", "5");
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return (json.data || json.tasks || []).map((task: Record<string, unknown>) => ({
        id: task.id,
        title: task.title || "",
        titleEn: task.titleEn || task.title || "",
        priority: task.priority || "NORMAL",
        status: task.status || "TODO",
        dueDate: task.dueDate || null,
        projectName: (task.project as Record<string, unknown> | undefined)?.name || "",
        projectNameEn: (task.project as Record<string, unknown> | undefined)?.nameEn || (task.project as Record<string, unknown> | undefined)?.name || "",
      }));
    },
    enabled: !!user?.id,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status: "DONE" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });

  const tasks = (apiTasks || []).slice(0, 5);

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-500";
      case "HIGH": return "bg-amber-500";
      default: return "bg-slate-400";
    }
  };

  const getDaysInfo = (dueDate: string | null) => {
    if (!dueDate) return { days: 999, label: "", badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let label: string;
    let badgeClass: string;
    if (days < 0) {
      label = isAr ? `متأخر ${Math.abs(days)} يوم` : `${Math.abs(days)}d overdue`;
      badgeClass = "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800";
    } else if (days === 0) {
      label = tAuto('auto.today');
      badgeClass = "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
    } else if (days === 1) {
      label = tAuto('auto.tomorrow');
      badgeClass = "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
    } else if (days <= 3) {
      label = isAr ? `${days} أيام` : `${days}d`;
      badgeClass = "bg-amber-100/70 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 border border-amber-200/60 dark:border-amber-800/60";
    } else {
      label = isAr ? `${days} أيام` : `${days}d`;
      badgeClass = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800";
    }
    return { days, label, badgeClass };
  };

  const pendingCount = tasks.filter((t) => t.status !== "DONE").length;

  return (
    <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-md transition-shadow">
      {/* Teal gradient header */}
      <div className="bg-gradient-to-l from-brand-navy-600 to-brand-navy-700 dark:from-brand-navy-800 dark:to-brand-navy-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ListTodo className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {tAuto('auto.myTasks')}
              </h3>
              <p className="text-[11px] text-white/70">
                {isAr ? `${pendingCount} مهمة معلقة` : `${pendingCount} tasks pending`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage("tasks")}
            className="text-xs text-white/80 hover:text-white transition-colors flex items-center gap-1"
          >
            {tAuto('auto.viewAll')}
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {tasks.map((task, idx) => {
            const { days, label, badgeClass } = getDaysInfo(task.dueDate);
            const isOverdue = days < 0;
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30",
                  idx % 2 === 1 && "bg-slate-50/40 dark:bg-slate-800/10"
                )}
              >
                {/* Priority dot */}
                <span className={cn("w-2 h-2 rounded-full shrink-0", getPriorityDot(task.priority))} />

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {isAr ? task.title : task.titleEn || task.title}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {isAr ? task.projectName : task.projectNameEn || task.projectName}
                  </p>
                </div>

                {/* Due date badge */}
                {label && (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                    badgeClass,
                    isOverdue && "animate-pulse"
                  )}>
                    <Clock className="h-2.5 w-2.5" />
                    {label}
                  </span>
                )}

                {/* Mark done button */}
                <button
                  onClick={() => completeMutation.mutate(task.id)}
                  className="h-6 w-6 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 hover:bg-brand-navy-50 hover:border-brand-navy-500 dark:hover:bg-brand-navy-950/30 dark:hover:border-brand-navy-500 transition-colors group"
                  title={tAuto('auto.markDone')}
                >
                  <CheckCheck className="h-3 w-3 text-slate-400 group-hover:text-brand-navy-500 transition-colors" />
                </button>
              </div>
            );
          })}
        </div>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tAuto('auto.noPendingTasks')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
