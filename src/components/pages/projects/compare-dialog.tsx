"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "./types";
import { ComparisonTable } from "./comparison-table";

interface CompareDialogProps {
  isAr: boolean;
  t: (ar: string, en: string) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compareProjects: ProjectRow[];
}

export function CompareDialog({
  isAr,
  t,
  open,
  onOpenChange,
  compareProjects,
}: CompareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", compareProjects.length === 3 ? "max-w-5xl" : "max-w-3xl")}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-brand-navy-500" />
              {t("مقارنة المشاريع", "Project Comparison")}
            </DialogTitle>
            <Badge variant="secondary" className="text-xs">
              {compareProjects.length} {t("مشروع", "projects")}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Project headers */}
          <div className={cn("grid gap-3", compareProjects.length === 3 ? "grid-cols-[140px_repeat(3,1fr)]" : "grid-cols-[140px_repeat(2,1fr)]")}>
            <div />
            {compareProjects.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {isAr ? p.name : p.nameEn || p.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{p.number}</div>
              </div>
            ))}
          </div>

          {/* Comparison rows */}
          <ComparisonTable
            projects={compareProjects}
            isAr={isAr}
            t={t}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("إغلاق", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
