"use client";


import { useTranslations } from 'next-intl';
import { Card, CardContent } from "@/components/ui/card";
import { Gavel, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { XCircle as RejectIcon } from "lucide-react";

interface SummaryCardsProps {
  ar: boolean;
  totalBids: number;
  wonCount: number;
  lostCount: number;
  winRate: string;
}

export function SummaryCards({ ar, totalBids, wonCount, lostCount, winRate }: SummaryCardsProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Gavel className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-amber-100">{tAuto('auto.totalBids')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{totalBids}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Trophy className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-emerald-100">{tAuto('auto.won')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{wonCount}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><RejectIcon className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-red-100">{tAuto('auto.lost')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{lostCount}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/50"><TrendingUp className="h-3.5 w-3.5 text-brand-navy-600 dark:text-brand-navy-400" /></div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.winRate')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xl font-bold tabular-nums",
              parseFloat(winRate) >= 50 ? "text-emerald-600 dark:text-emerald-400" :
              parseFloat(winRate) >= 30 ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {winRate}%
            </span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  parseFloat(winRate) >= 50 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                  parseFloat(winRate) >= 30 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                  "bg-gradient-to-r from-red-400 to-red-500"
                )}
                style={{ width: `${Math.min(parseFloat(winRate), 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
