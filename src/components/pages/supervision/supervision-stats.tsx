"use client";


import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
} from "lucide-react";

interface SupervisionStatsProps {
  ar: boolean;
  totalVisits: number;
  openViolations: number;
  resolvedViolations: number;
  avgProgress: number;
}

export function SupervisionStats({
  ar,
  totalVisits,
  openViolations,
  resolvedViolations,
  avgProgress,
}: SupervisionStatsProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="p-4 bg-gradient-to-br from-brand-navy-50 to-cyan-50 dark:from-brand-navy-950/20 dark:to-cyan-950/20 border-brand-navy-100 dark:border-brand-navy-900/30">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardCheck className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{tAuto('auto.totalVisits')}</span>
        </div>
        <div className="text-2xl font-bold text-brand-navy-700 dark:text-brand-navy-300">{totalVisits}</div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-100 dark:border-red-900/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{tAuto('auto.openViolations')}</span>
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{openViolations}</div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-100 dark:border-emerald-900/30">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{tAuto('auto.resolved')}</span>
        </div>
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{resolvedViolations}</div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20 border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpDown className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{tAuto('auto.avgProgress')}</span>
        </div>
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgProgress}%</div>
        <Progress value={avgProgress} className="h-1.5 mt-2 bg-blue-100 dark:bg-blue-900/30" />
      </Card>
    </div>
  );
}
