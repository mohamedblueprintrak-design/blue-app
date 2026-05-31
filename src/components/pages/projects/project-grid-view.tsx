"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "./types";
import { statusConfig, typeConfig } from "./types";

interface ProjectGridViewProps {
  isAr: boolean;
  t: (ar: string, en: string) => string;
  projects: ProjectRow[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
}

export function ProjectGridView({
  isAr,
  t,
  projects,
  isLoading,
  onRowClick,
}: ProjectGridViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-3 w-1/2 mb-4" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))
      ) : projects.length === 0 ? (
        <div className="col-span-full flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500 py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="text-center">
            <span className="font-medium text-sm">{t("لا توجد مشاريع", "No projects found")}</span>
            <p className="text-xs mt-1 text-slate-400 dark:text-slate-600">{t("أضف مشروعاً جديداً للبدء", "Add a new project to get started")}</p>
          </div>
        </div>
      ) : (
        projects.map((project: ProjectRow) => {
          const st = statusConfig[project.status] || statusConfig.active;
          const tp = typeConfig[project.type] || typeConfig.VILLA;
          const healthColor = project.status === "COMPLETED" ? "bg-emerald-500" : project.status === "DELAYED" ? "bg-red-500" : project.progress >= 50 ? "bg-amber-500" : "bg-emerald-500";
          const healthRing = project.status === "COMPLETED" ? "ring-emerald-200 dark:ring-emerald-800" : project.status === "DELAYED" ? "ring-red-200 dark:ring-red-800" : project.progress >= 50 ? "ring-amber-200 dark:ring-amber-800" : "ring-emerald-200 dark:ring-emerald-800";
          // Deterministic sparkline based on project id hash (no Math.random in render)
          const sparklineSeed = project.id.charCodeAt(0) % 10;
          const sparkline = [
            Math.max(5, project.progress * 0.6 + (sparklineSeed % 7) * 4),
            Math.max(5, project.progress * 0.8 + (sparklineSeed % 5) * 4),
            Math.max(5, project.progress * 0.9 + (sparklineSeed % 3) * 3),
            Math.max(5, project.progress),
          ];
          return (
            <div
              key={project.id}
              className="rounded-xl border border-slate-200/70 dark:border-slate-700/40 bg-white dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:shadow-teal-500/5 hover:-translate-y-1 hover:border-teal-200 dark:hover:border-teal-800/60 group"
              onClick={() => onRowClick(project.id)}
            >
              {/* Gradient header */}
              <div className="bg-gradient-to-l from-teal-500/10 via-cyan-500/5 to-transparent dark:from-teal-500/5 dark:via-cyan-500/5 dark:to-transparent px-4 pt-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={cn("w-2.5 h-2.5 rounded-full ring-2 shrink-0", healthColor, healthRing)} />
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{isAr ? project.name : project.nameEn || project.name}</div>
                  </div>
                  <span className={cn("shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full ms-2", st.className)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full me-1 inline-block", st.dotColor)} />
                    {t(st.ar, st.en)}
                  </span>
                </div>
              </div>
              <div className="px-4 pb-4 pt-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-mono">{project.number}</div>
                {project.plotNumber && (
                  <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mb-3 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    {project.plotNumber}
                  </div>
                )}
                {/* Progress */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-end gap-[2px] h-4">
                    {sparkline.map((h, i) => (
                      <div key={i} className={cn("w-[3px] rounded-full", h >= 75 ? "bg-teal-400" : h >= 40 ? "bg-teal-300" : "bg-amber-400")} style={{ height: `${Math.min(h, 100) * 0.16}px` }} />
                    ))}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-teal-500 to-cyan-400 transition-all duration-500" style={{ width: `${project.progress}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{Math.round(project.progress)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{project.location}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{project.budget.toLocaleString()} AED</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <Badge variant="outline" className={cn("text-[9px] border-0", tp.color)}>{t(tp.ar, tp.en)}</Badge>
                  <span className="text-[9px] text-slate-400">{project.client?.name || "—"}</span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 text-[9px] text-slate-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {project._count?.tasks || 0}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
