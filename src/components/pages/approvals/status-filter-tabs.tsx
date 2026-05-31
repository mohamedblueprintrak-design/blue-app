"use client";

import { cn } from "@/lib/utils";
import { statusFilterTabs, type StatusFilterTab } from "./types";
import { getFilterLabel } from "./helpers";

interface StatusFilterTabsProps {
  ar: boolean;
  activeStatusFilter: StatusFilterTab;
  setActiveStatusFilter: (tab: StatusFilterTab) => void;
  statusCounts: Record<string, number>;
  pendingCount: number;
}

export function StatusFilterTabs({ ar, activeStatusFilter, setActiveStatusFilter, statusCounts, pendingCount }: StatusFilterTabsProps) {
  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 gap-0.5 overflow-x-auto scrollbar-none">
      {statusFilterTabs.map((tab) => {
        const isActive = activeStatusFilter === tab;
        const count = statusCounts[tab] || 0;
        return (
          <button
            key={tab}
            onClick={() => setActiveStatusFilter(tab)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
              isActive
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {tab === "PENDING" && pendingCount > 0 && isActive && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
            )}
            {getFilterLabel(tab, ar)}
            {count > 0 && (
              <span className={cn(
                "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                isActive
                  ? tab === "PENDING"
                    ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                    : tab === "APPROVED"
                      ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                      : tab === "REJECTED"
                        ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                        : "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
