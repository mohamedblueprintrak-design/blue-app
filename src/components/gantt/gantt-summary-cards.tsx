import { useTranslations } from 'next-intl';
import React from "react";
import { Play, CheckCircle, CalendarDays, TrendingUp, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface GanttSummaryCardsProps {
  ar: boolean;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  avgProgress: number;
}

export function GanttSummaryCards({
  ar: _ar,
  totalTasks,
  activeTasks,
  completedTasks,
  avgProgress,
}: GanttSummaryCardsProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-600 dark:to-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{totalTasks}</div>
          <p className="text-[11px] text-slate-200 mt-0.5">{tAuto('auto.totalTasks')}</p>
        </div>
      </Card>

      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
        <div className="bg-gradient-to-br from-brand-navy-500 to-cyan-600 dark:from-brand-navy-600 dark:to-cyan-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="flex items-center gap-0.5 text-[10px] text-brand-navy-100">
              <Play className="h-2.5 w-2.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{activeTasks}</div>
          <p className="text-[11px] text-brand-navy-100 mt-0.5">{tAuto('auto.inProgress')}</p>
        </div>
      </Card>

      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <CheckCircle className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{completedTasks}</div>
          <p className="text-[11px] text-emerald-100 mt-0.5">{tAuto('auto.completed')}</p>
        </div>
      </Card>

      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <CalendarDays className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{avgProgress}%</div>
          <p className="text-[11px] text-violet-100 mt-0.5">{tAuto('auto.avgProgress')}</p>
        </div>
      </Card>
    </div>
  );
}
