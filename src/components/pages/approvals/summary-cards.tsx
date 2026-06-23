"use client";


import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { ClipboardCheck, Clock, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SummaryCardsProps {
  ar: boolean;
  totalCount: number;
  pendingCount: number;
  approvedThisMonthCount: number;
  rejectedCount: number;
}

export function SummaryCards({ ar, totalCount, pendingCount, approvedThisMonthCount, rejectedCount }: SummaryCardsProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Approvals */}
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-600 dark:to-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <ClipboardCheck className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="flex items-center gap-0.5 text-[10px] text-slate-200">
              <Minus className="h-2.5 w-2.5" />
              {tAuto('auto.stable')}
            </span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{totalCount}</div>
          <p className="text-[11px] text-slate-200 mt-0.5">{tAuto('auto.totalApprovals')}</p>
        </div>
      </Card>

      {/* Pending */}
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 p-4 relative">
          {pendingCount > 0 && (
            <div className="absolute top-3 right-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5 text-white" />
            </div>
            {pendingCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-100">
                <TrendingUp className="h-2.5 w-2.5" />
                {tAuto('auto.needsAction')}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{pendingCount}</div>
          <p className="text-[11px] text-amber-100 mt-0.5">{tAuto('auto.pending')}</p>
        </div>
      </Card>

      {/* Approved This Month */}
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-100">
              <TrendingUp className="h-2.5 w-2.5" />
              {tAuto('auto.thisMonth')}
            </span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{approvedThisMonthCount}</div>
          <p className="text-[11px] text-emerald-100 mt-0.5">{tAuto('auto.approvedThisMonth')}</p>
        </div>
      </Card>

      {/* Rejected */}
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <XCircle className="h-3.5 w-3.5 text-white" />
            </div>
            {rejectedCount > 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] text-red-100">
                <TrendingDown className="h-2.5 w-2.5" />
                {rejectedCount}
              </span>
            ) : (
              <span className="text-[10px] text-red-100">{tAuto('auto.none')}</span>
            )}
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{rejectedCount}</div>
          <p className="text-[11px] text-red-100 mt-0.5">{tAuto('auto.rejected')}</p>
        </div>
      </Card>
    </div>
  );
}
