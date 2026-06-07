"use client";

import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/ui/status-icon";
import { categories } from "./constants";

export function getCategoryBadge(category: string, ar: boolean) {
  const cat = categories.find((c) => c.value === category);
  return (
    <Badge variant="secondary" className={`text-[10px] h-5 ${cat?.color || ""}`}>
      {cat ? (ar ? cat.ar : cat.en) : category}
    </Badge>
  );
}

export function getStrategyBadge(strategy: string, ar: boolean) {
  const _cat = categories.find((c) => c.value === strategy);
  // Use strategies from constants
  const strategies = [
    { value: "AVOID", ar: "\u062a\u062c\u0646\u0628", en: "Avoid", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    { value: "MITIGATE", ar: "\u062a\u062e\u0641\u064a\u0641", en: "Mitigate", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    { value: "TRANSFER", ar: "\u0646\u0642\u0644", en: "Transfer", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
    { value: "ACCEPT", ar: "\u0642\u0628\u0648\u0644", en: "Accept", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  ];
  const strat = strategies.find((s) => s.value === strategy);
  return (
    <Badge variant="secondary" className={`text-[10px] h-5 ${strat?.color || ""}`}>
      {strat ? (ar ? strat.ar : strat.en) : strategy}
    </Badge>
  );
}

export function getStatusBadge(status: string, ar: boolean) {
  const configs: Record<string, { label: string; labelEn: string; color: string }> = {
    OPEN: { label: "\u0645\u0641\u062a\u0648\u062d", labelEn: "Open", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
    mitigating: { label: "\u0642\u064a\u062f \u0627\u0644\u062a\u062e\u0641\u064a\u0641", labelEn: "Mitigating", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    RESOLVED: { label: "\u062a\u0645 \u0627\u0644\u062d\u0644", labelEn: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
    CLOSED: { label: "\u0645\u063a\u0644\u0642", labelEn: "Closed", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  };
  const cfg = configs[status] || configs.OPEN;
  return (
    <Badge variant="secondary" className={`text-[10px] h-5 flex items-center gap-1 ${cfg.color}`}>
      <StatusIcon status={status} className="h-3 w-3" />
      {ar ? cfg.label : cfg.labelEn}
    </Badge>
  );
}

export function getScoreColor(score: number) {
  if (score <= 4) return "bg-green-500";
  if (score <= 9) return "bg-yellow-500";
  if (score <= 15) return "bg-orange-500";
  return "bg-red-500";
}

export function getScoreTextColor(score: number) {
  if (score <= 4) return "text-green-700 dark:text-green-400";
  if (score <= 9) return "text-yellow-700 dark:text-yellow-400";
  if (score <= 15) return "text-orange-700 dark:text-orange-400";
  return "text-red-700 dark:text-red-400";
}

export function getMatrixCellColor(prob: number, impact: number) {
  const score = prob * impact;
  if (score <= 4) return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800/50";
  if (score <= 9) return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800/50";
  if (score <= 15) return "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/50";
  return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50";
}

export function getMatrixDotColor(prob: number, impact: number) {
  const score = prob * impact;
  if (score <= 4) return "bg-green-600";
  if (score <= 9) return "bg-yellow-600";
  if (score <= 15) return "bg-orange-600";
  return "bg-red-600";
}
