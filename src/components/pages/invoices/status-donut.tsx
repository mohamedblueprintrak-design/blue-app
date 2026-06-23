"use client";


import { useTranslations } from 'next-intl';
interface StatusDonutProps {
  ar: boolean;
  filteredCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  paidPct: number;
  pendingPct: number;
  overduePct: number;
}

export function StatusDonut({
  ar,
  filteredCount,
  paidCount,
  pendingCount,
  overdueCount,
  paidPct,
  pendingPct,
  overduePct,
}: StatusDonutProps) {
  const tAuto = useTranslations();
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-3 shadow-sm">
      <div
        className="relative w-12 h-12 rounded-full shrink-0"
        style={{
          background: `conic-gradient(
            #10b981 0deg ${paidPct}deg,
            #f59e0b ${paidPct}deg ${paidPct + pendingPct}deg,
            #ef4444 ${paidPct + pendingPct}deg ${paidPct + pendingPct + overduePct}deg,
            #e2e8f0 ${paidPct + pendingPct + overduePct}deg 360deg
          )`,
        }}
      >
        <div className="absolute inset-[3px] rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">{filteredCount}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{tAuto('auto.paid')}</span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{paidCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{tAuto('auto.pending')}</span>
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">{pendingCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{tAuto('auto.overdue')}</span>
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 tabular-nums">{overdueCount}</span>
        </div>
      </div>
    </div>
  );
}
