import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import {
  FolderKanban,
  AlertTriangle,
  Receipt,
  Calendar,
  MessageCircle,
  ShieldAlert,
} from "lucide-react";
import type { DashboardStats, DashboardInvoices, UpcomingTask } from "./types";

interface QuickOverviewProps {
  stats: DashboardStats;
  overdueTasksCount: number;
  invoices: DashboardInvoices;
  upcomingTasks: UpcomingTask[];
  isAr: boolean;
}

export function QuickOverview({ stats, overdueTasksCount, invoices, upcomingTasks, isAr }: QuickOverviewProps) {
  const tAuto = useTranslations();
  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="flex gap-3 min-w-max">
        {[
          { icon: FolderKanban, count: stats.activeProjects, label: tAuto('auto.activeProjects'), bg: "bg-teal-50 dark:bg-teal-950/30", iconBg: "bg-teal-100 dark:bg-teal-900/50", iconColor: "text-teal-600 dark:text-teal-400" },
          { icon: AlertTriangle, count: overdueTasksCount, label: tAuto('auto.overdueTasks'), bg: "bg-red-50 dark:bg-red-950/20", iconBg: "bg-red-100 dark:bg-red-900/50", iconColor: "text-red-600 dark:text-red-400" },
          { icon: Receipt, count: invoices.outstandingCount, label: tAuto('auto.pendingInvoices'), bg: "bg-amber-50 dark:bg-amber-950/20", iconBg: "bg-amber-100 dark:bg-amber-900/50", iconColor: "text-amber-600 dark:text-amber-400" },
          { icon: Calendar, count: upcomingTasks.length, label: tAuto('auto.upcomingMeetings'), bg: "bg-sky-50 dark:bg-sky-950/20", iconBg: "bg-sky-100 dark:bg-sky-900/50", iconColor: "text-sky-600 dark:text-sky-400" },
          { icon: MessageCircle, count: 3, label: tAuto('auto.openRFIs'), bg: "bg-violet-50 dark:bg-violet-950/20", iconBg: "bg-violet-100 dark:bg-violet-900/50", iconColor: "text-violet-600 dark:text-violet-400" },
          { icon: ShieldAlert, count: stats.delayedProjects, label: tAuto('auto.criticalRisks'), bg: "bg-rose-50 dark:bg-rose-950/20", iconBg: "bg-rose-100 dark:bg-rose-900/50", iconColor: "text-rose-600 dark:text-rose-400" },
        ].map((pill, idx) => {
          const PillIcon = pill.icon;
          return (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-transparent",
                pill.bg,
                "hover:shadow-md hover:scale-[1.02] transition-all duration-200"
              )}
            >
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", pill.iconBg)}>
                <PillIcon className={cn("h-4 w-4", pill.iconColor)} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{pill.count}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{pill.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
