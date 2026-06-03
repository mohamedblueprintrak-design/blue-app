"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatCardConfig } from "./types";

interface StatCardsProps {
  statCards: StatCardConfig[];
}

export function StatCards({ statCards }: StatCardsProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {statCards.map((card, i) => {
        const Icon = card.icon;
        // Deterministic sparkline bar heights based on card index (pure CSS, no logic change)
        const sparkBars = [
          [60, 80, 55],
          [45, 70, 90],
          [70, 55, 85],
          [50, 65, 40],
        ];
        const bars = sparkBars[i % sparkBars.length];
        const sparkColor = card.trend?.isPositive
          ? "bg-emerald-400 dark:bg-emerald-500"
          : "bg-red-400 dark:bg-red-500";

        return (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
            <Card
              className={cn(
                "rounded-xl border-slate-200/80 dark:border-slate-700/50 transition-all duration-300 ease-out",
                "hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60 hover:scale-[1.02] hover:-translate-y-1",
                "border-s-4",
                "bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-800/50",
                card.borderAccent
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md",
                    card.gradientFrom, card.gradientTo
                  )}>
                    <Icon className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end items-center">
                    {card.trend && (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        card.trend.isPositive
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400"
                      )}>
                        {card.trend.isPositive
                          ? <ArrowUpRight className="h-3 w-3" />
                          : <ArrowDownRight className="h-3 w-3" />
                        }
                        {card.trend.value}{card.trend.label}
                      </span>
                    )}
                    {card.secondaryBadge && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 dark:bg-red-950/50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        {card.secondaryBadge.value} {card.secondaryBadge.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="min-w-0">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {card.value}
                      {card.valueSuffix && (
                        <span className="text-base font-medium text-slate-400 ms-1">{card.valueSuffix}</span>
                      )}
                      {card.valueSub && (
                        <span className="text-sm font-normal text-slate-400 ms-1">{card.valueSub}</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {card.label}
                    </div>
                  </div>
                  {/* Sparkline mini chart - 3 CSS bars */}
                  <div className="flex items-end gap-[3px] h-8 ms-3 shrink-0" aria-hidden="true">
                    {bars.map((h, bi) => (
                      <div
                        key={bi}
                        className={cn(
                          "w-[5px] rounded-sm transition-all duration-300",
                          bi === bars.length - 1 ? sparkColor : "bg-slate-200 dark:bg-slate-700"
                        )}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
