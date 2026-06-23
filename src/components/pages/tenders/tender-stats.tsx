"use client";


import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, Trophy, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface TenderStatsProps {
  totalCount: number;
  total: number;
  preparingCount: number;
  wonCount: number;
  lostCount: number;
  wonBudget: number;
  isLoading: boolean;
  isAr: boolean;
}

export function TenderStats({
  totalCount,
  total,
  preparingCount,
  wonCount,
  lostCount,
  wonBudget,
  isLoading,
  isAr,
}: TenderStatsProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <FileText className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.totalTenders')}</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {isLoading ? <Skeleton className="h-6 w-12" /> : totalCount}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            {isAr ? `${total} مناقصة مسجلة` : `${total} registered tenders`}
          </p>
        </div>
      </Card>

      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400">{tAuto('auto.inProgress')}</span>
          </div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
            {isLoading ? <Skeleton className="h-6 w-12" /> : preparingCount}
          </div>
          <p className="text-[10px] text-amber-500/60 dark:text-amber-400/60 mt-1">
            {tAuto('auto.preparingSubmitting')}
          </p>
        </div>
      </Card>

      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <Trophy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{tAuto('auto.won')}</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {isLoading ? <Skeleton className="h-6 w-12" /> : wonCount}
          </div>
          <p className="text-[10px] text-emerald-500/60 dark:text-emerald-400/60 mt-1">
            {wonCount > 0 ? formatCurrency(wonBudget, isAr) : (tAuto('auto.noneYet'))}
          </p>
        </div>
      </Card>

      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs text-red-600 dark:text-red-400">{tAuto('auto.lost')}</span>
          </div>
          <div className="text-xl font-bold text-red-700 dark:text-red-300 tabular-nums">
            {isLoading ? <Skeleton className="h-6 w-12" /> : lostCount}
          </div>
          <p className="text-[10px] text-red-500/60 dark:text-red-400/60 mt-1">
            {tAuto('auto.lostTenders')}
          </p>
        </div>
      </Card>
    </div>
  );
}
