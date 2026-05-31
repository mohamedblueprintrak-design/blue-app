"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, MapPin, HardHat, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "./types";
import { statusConfig, typeConfig, MAX_COMPARE } from "./types";

interface ProjectTableViewProps {
  isAr: boolean;
  t: (ar: string, en: string) => string;
  projects: ProjectRow[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (id: string) => void;
  onQuickView: (project: ProjectRow) => void;
  page: number;
  totalPages: number;
  allProjectsCount: number;
  PAGE_SIZE: number;
  onPageChange: (page: number) => void;
}

export function ProjectTableView({
  isAr,
  t,
  projects,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onQuickView,
  page,
  totalPages,
  allProjectsCount,
  PAGE_SIZE,
  onPageChange,
}: ProjectTableViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-800/50">
            <TableHead className="w-10">
              <Checkbox
                checked={projects.length > 0 && selectedIds.size === projects.length}
                onCheckedChange={onToggleSelectAll}
                className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
              />
            </TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">{t("رقم المشروع", "No.")}</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">{t("اسم المشروع", "Project Name")}</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">{t("العميل", "Client")}</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300 font-semibold hidden lg:table-cell">{t("الموقع", "Location")}</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">{t("النوع", "Type")}</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">{t("الحالة", "Status")}</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300 font-semibold hidden md:table-cell">{t("الإنجاز", "Progress")}</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300 font-semibold hidden sm:table-cell">{t("الميزانية", "Budget")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 10 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-16">
                <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <span className="font-medium text-sm">{t("لا توجد مشاريع", "No projects found")}</span>
                    <p className="text-xs mt-1 text-slate-400 dark:text-slate-600">{t("أضف مشروعاً جديداً للبدء", "Add a new project to get started")}</p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project: ProjectRow) => {
              const st = statusConfig[project.status] || statusConfig.ACTIVE;
              const tp = typeConfig[project.type] || typeConfig.VILLA;
              const isSelected = selectedIds.has(project.id);
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
                <TableRow
                  key={project.id}
                  className={cn(
                    "cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/10 transition-all duration-200 hover:scale-[1.005] hover:shadow-lg",
                    isSelected && "bg-teal-50/60 dark:bg-teal-950/20"
                  )}
                  onClick={() => onRowClick(project.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      disabled={!isSelected && selectedIds.size >= MAX_COMPARE}
                      onCheckedChange={() => onToggleSelect(project.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm text-slate-600 dark:text-slate-400">
                      {project.number}
                      {project.plotNumber && (
                        <span className="block text-[10px] text-teal-600 dark:text-teal-400 font-medium font-sans">
                          {project.plotNumber}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full ring-2 shrink-0", healthColor, healthRing)} />
                      <div className="font-medium text-slate-900 dark:text-white truncate">
                        {isAr ? project.name : project.nameEn || project.name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{project.client?.name || "—"}</span>
                      {project.contractor && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <HardHat className="h-2.5 w-2.5 text-amber-500" />
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">{project.contractor.companyName || project.contractor.name}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[150px]">{project.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs font-medium border-0", tp.color)}>
                      {t(tp.ar, tp.en)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs font-medium", st.className)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full me-1.5 inline-block", st.dotColor, "animate-pulse")} />
                      {t(st.ar, st.en)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      {/* Mini sparkline bars */}
                      <div className="flex items-end gap-[2px] h-4">
                        {sparkline.map((h, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-[3px] rounded-full transition-all",
                              h >= 75 ? "bg-teal-400" : h >= 40 ? "bg-teal-300" : "bg-amber-400"
                            )}
                            style={{ height: `${Math.min(h, 100) * 0.16}px` }}
                          />
                        ))}
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-teal-500 to-cyan-400 transition-all duration-500" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-10 text-end tabular-nums">
                        {Math.round(project.progress)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {project.budget.toLocaleString()} <span className="text-xs text-slate-400">AED</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickView(project);
                      }}
                      aria-label="Quick view"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {/* Pagination */}
      {allProjectsCount > PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t(`صفحة ${page} من ${totalPages}`, `Page ${page} of ${totalPages}`)}
            <span className="ms-2">({allProjectsCount} {t("مشاريع", "projects")})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-7 w-7 text-xs",
                    page === pageNum
                      ? "bg-teal-600 hover:bg-teal-700 text-white border-teal-600"
                      : ""
                  )}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
