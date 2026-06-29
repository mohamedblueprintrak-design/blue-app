"use client";

import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, Activity, Wallet, Calendar, Tag, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "./types";

interface ComparisonTableProps {
  projects: ProjectRow[];
  isAr: boolean;
  t: (ar: string, en: string) => string;
}

export function ComparisonTable({
  projects,
  isAr,
  t,
}: ComparisonTableProps) {
  if (projects.length < 2) return null;

  const gridCols = projects.length === 3
    ? "grid-cols-[140px_repeat(3,1fr)]"
    : "grid-cols-[140px_repeat(2,1fr)]";

  const rows = [
    {
      label: t("العميل", "Client"),
      icon: <Users className="h-3.5 w-3.5" />,
      values: projects.map((p) => p.client?.name || "—"),
      type: "text" as const,
    },
    {
      label: t("الحالة", "Status"),
      icon: <Activity className="h-3.5 w-3.5" />,
      values: projects.map((p) => p.status),
      type: "text" as const,
    },
    {
      label: t("الإنجاز", "Progress"),
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      values: projects.map((p) => p.progress),
      type: "progress" as const,
    },
    {
      label: t("الميزانية", "Budget"),
      icon: <Wallet className="h-3.5 w-3.5" />,
      values: projects.map((p) => p.budget),
      type: "currency" as const,
    },
    {
      label: t("تاريخ البدء", "Start Date"),
      icon: <Calendar className="h-3.5 w-3.5" />,
      values: projects.map((p) => p.createdAt),
      type: "date" as const,
    },
    {
      label: t("تاريخ الانتهاء", "End Date"),
      icon: <Calendar className="h-3.5 w-3.5" />,
      values: projects.map((p) => p.createdAt),
      type: "date" as const,
      isEndDate: true,
    },
    {
      label: t("النوع", "Type"),
      icon: <Tag className="h-3.5 w-3.5" />,
      values: projects.map((p) => p.type),
      type: "text" as const,
    },
    {
      label: t("الموقع", "Location"),
      icon: <MapPin className="h-3.5 w-3.5" />,
      values: projects.map((p) => p.location || "—"),
      type: "text" as const,
    },
  ];

  const maxProgress = Math.max(...projects.map((p) => p.progress));
  const minProgress = Math.min(...projects.map((p) => p.progress));

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {rows.map((row, idx) => {
        const isDifferent = row.type !== "text"
          ? true
          : new Set(row.values).size > 1;
        return (
          <div
            key={idx}
            className={cn(
              "grid gap-0",
              gridCols,
              idx % 2 === 0
                ? "bg-white dark:bg-slate-900"
                : "bg-slate-50/50 dark:bg-slate-800/30"
            )}
          >
            {/* Label */}
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 border-e border-slate-200 dark:border-slate-700">
              {row.icon}
              {row.label}
            </div>

            {/* Values */}
            {row.type === "progress" ? (
              projects.map((p, i) => {
                const val = p.progress;
                const isBest = isDifferent && val === maxProgress && maxProgress !== minProgress;
                const isWorst = isDifferent && val === minProgress && maxProgress !== minProgress;
                return (
                  <div key={i} className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Progress value={val} className="h-2 flex-1" />
                      <span className={cn(
                        "text-xs font-semibold tabular-nums w-10 text-end",
                        isBest
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isWorst
                          ? "text-red-500 dark:text-red-400"
                          : "text-slate-600 dark:text-slate-400"
                      )}>
                        {Math.round(val)}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : row.type === "currency" ? (
              projects.map((p, i) => {
                const val = p.budget;
                const maxBudget = Math.max(...projects.map((pp) => pp.budget));
                const minBudget = Math.min(...projects.map((pp) => pp.budget));
                const isBest = isDifferent && val === maxBudget && maxBudget !== minBudget;
                const isWorst = isDifferent && val === minBudget && maxBudget !== minBudget;
                return (
                  <div key={i} className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {isDifferent && (
                        isBest
                          ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                          : isWorst
                          ? <TrendingDown className="h-3 w-3 text-red-400" />
                          : null
                      )}
                      <span className={cn(
                        "text-sm font-medium tabular-nums font-mono",
                        isBest
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isWorst
                          ? "text-red-500 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300"
                      )}>
                        {val.toLocaleString()} AED
                      </span>
                    </div>
                  </div>
                );
              })
            ) : row.type === "date" ? (
              projects.map((p, i) => {
                const val = p.createdAt;
                const dates = projects.map((pp) => new Date(pp.createdAt).getTime());
                const maxDate = Math.max(...dates);
                const minDate = Math.min(...dates);
                const curDate = new Date(val).getTime();
                const isEndDate = "isEndDate" in row && row.isEndDate;
                const isBest = isDifferent && !isEndDate
                  ? curDate === minDate
                  : isDifferent && isEndDate
                  ? curDate === maxDate
                  : false;
                const isWorst = isDifferent && !isEndDate
                  ? curDate === maxDate && maxDate !== minDate
                  : isDifferent && isEndDate
                  ? curDate === minDate && maxDate !== minDate
                  : false;
                return (
                  <div key={i} className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {isDifferent && (
                        isBest
                          ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                          : isWorst
                          ? <TrendingDown className="h-3 w-3 text-red-400" />
                          : null
                      )}
                      <span className={cn(
                        "text-sm",
                        isBest
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : isWorst
                          ? "text-red-500 dark:text-red-400 font-medium"
                          : "text-slate-700 dark:text-slate-300"
                      )}>
                        {isEndDate
                          ? t("غير محدد", "Not set")
                          : new Date(val).toLocaleDateString(isAr ? "ar-AE" : "en-US")}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              row.values.map((val, i) => (
                <div key={i} className="px-3 py-2.5">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {val}
                  </span>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
