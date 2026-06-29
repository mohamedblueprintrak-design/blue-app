"use client";


import { useTranslations } from 'next-intl';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import type { Summary } from "./types";

interface TimesheetStatsProps {
  ar: boolean;
  summary: Summary;
}

export function TimesheetStats({ ar: _ar, summary }: TimesheetStatsProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tAuto('auto.hoursThisWeek')}
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {Number(summary.thisWeekHours) || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-amber-200 dark:border-amber-800/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Send className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tAuto('auto.pendingApproval')}
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {summary.pending}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-emerald-200 dark:border-emerald-800/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tAuto('auto.approved')}
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {summary.approved}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-red-200 dark:border-red-800/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tAuto('auto.rejected')}
              </p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                {summary.rejected}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
