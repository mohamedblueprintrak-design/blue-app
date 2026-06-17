"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Layers, CheckCircle2, AlertTriangle, GitCompareArrows } from "lucide-react";

interface DesignStatsProps {
  language: "ar" | "en";
  totalDrawings: number;
  reviewedCount: number;
  needsRevisionCount: number;
  clashCount: number;
}

export function DesignStats({ language, totalDrawings, reviewedCount, needsRevisionCount, clashCount }: DesignStatsProps) {
  const ar = language === "ar";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Layers className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي الرسومات" : "Total Drawings"}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{totalDrawings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "تمت المراجعة" : "Reviewed"}</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{reviewedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "محتاجة تعديل" : "Needs Revision"}</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{needsRevisionCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <GitCompareArrows className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "تعارضات" : "Clashes"}</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{clashCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
