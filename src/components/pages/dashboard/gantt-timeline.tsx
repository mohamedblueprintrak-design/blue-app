import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle2, CircleDot, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentProject } from "./types";

interface GanttTimelineProps {
  recentProjects: RecentProject[];
  isAr: boolean;
}

export function GanttTimeline({ recentProjects, isAr }: GanttTimelineProps) {
  return (
    <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 relative">
        {/* Teal accent line */}
        <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {isAr ? "الجدول الزمني للمشاريع" : "Project Timeline"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? "نظرة عامة على تقدم المشاريع النشطة" : "Active projects progress overview"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" />
                <span className="text-slate-500 dark:text-slate-400">{isAr ? "نشط" : "Active"}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500 dark:text-slate-400">{isAr ? "مكتمل" : "Done"}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-slate-500 dark:text-slate-400">{isAr ? "متأخر" : "Delayed"}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rotate-45 bg-amber-400 rounded-sm" />
                <span className="text-slate-500 dark:text-slate-400">{isAr ? "معلم" : "Milestone"}</span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentProjects.slice(0, 5).map((project, idx) => {
            const progress = Math.round(project.progress);
            const isDelayed = project.status === "DELAYED";
            const isCompleted = project.status === "COMPLETED";
            const barColor = isDelayed
              ? "from-red-400 to-red-500 dark:from-red-500 dark:to-red-600"
              : isCompleted
                ? "from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600"
                : "from-teal-400 to-cyan-500 dark:from-teal-500 dark:to-cyan-600";
            const trackColor = isDelayed
              ? "bg-red-100 dark:bg-red-950/30"
              : isCompleted
                ? "bg-emerald-100 dark:bg-emerald-950/30"
                : "bg-teal-100/60 dark:bg-teal-950/30";
            // Milestone positions (deterministic based on project index)
            const milestonePct = [35, 60, 45, 75, 50][idx % 5];

            return (
              <div key={project.id} className="group">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Project Name */}
                  <div className="w-[100px] sm:w-[160px] shrink-0 min-w-0">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate block">
                      {isAr ? project.name : (project.nameEn || project.name)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {project.number}
                    </span>
                  </div>

                  {/* Gantt Bar */}
                  <div className="flex-1 relative min-w-0">
                    <div className={cn("h-7 rounded-lg overflow-hidden relative shadow-sm", trackColor)}>
                      {/* Progress bar */}
                      <div
                        className={cn(
                          "h-full rounded-lg bg-gradient-to-l transition-all duration-700 ease-out relative shadow-sm",
                          barColor
                        )}
                        style={{ width: `${Math.max(progress, 2)}%` }}
                      >
                        {/* Progress percentage label on bar */}
                        {progress > 15 && (
                          <span className="absolute inset-0 flex items-center justify-end pe-2">
                            <span className="text-[10px] font-bold text-white/90 tabular-nums drop-shadow-sm">{progress}%</span>
                          </span>
                        )}
                      </div>

                      {/* Milestone diamond */}
                      {milestonePct <= progress && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 z-10"
                          style={{ left: `${milestonePct}%` }}
                        >
                          <div className="w-3 h-3 rotate-45 bg-amber-400 dark:bg-amber-500 rounded-[2px] shadow-sm ring-2 ring-white dark:ring-slate-800" />
                        </div>
                      )}

                      {/* Today marker */}
                      {idx === 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-slate-400 dark:border-slate-500 z-10"
                          style={{ left: `${Math.min(progress + 5, 95)}%` }}
                        >
                          <div className="absolute -top-1 start-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400" />
                        </div>
                      )}
                    </div>
                    {/* Progress label outside bar when too small */}
                    {progress <= 15 && (
                      <span className="absolute start-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{progress}%</span>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="w-5 shrink-0 flex justify-center">
                    {isDelayed ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <CircleDot className="h-3.5 w-3.5 text-teal-500" />
                    )}
                  </div>
                </div>
                {idx < Math.min(recentProjects.length, 5) - 1 && (
                  <div className="border-t border-slate-50 dark:border-slate-800/50 mt-3" />
                )}
              </div>
            );
          })}
          {recentProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderKanban className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isAr ? "لا توجد مشاريع حالياً" : "No projects yet"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
