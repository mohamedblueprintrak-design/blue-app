"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Wallet,
  ChevronDown,
  CircleDot,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

// ===== Types =====
interface BudgetChild {
  id: string;
  name: string;
  category: string;
  planned: number;
  actual: number;
  committed: number;
  remaining: number;
  deviation: number;
  children: BudgetChild[];
}

interface BudgetItem {
  id: string;
  name: string;
  category: string;
  planned: number;
  actual: number;
  committed: number;
  remaining: number;
  deviation: number;
  children: BudgetChild[];
  project: { id: string; name: string; nameEn: string; number: string };
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }

// ===== Helpers =====

function getCategoryConfig(category: string) {
  const configs: Record<string, { ar: string; en: string; color: string; icon: string }> = {
    overall: { ar: "إجمالي", en: "Overall", color: "from-slate-500 to-slate-600", icon: "BarChart3" },
    ARCHITECTURAL: { ar: "معماري", en: "Architectural", color: "from-amber-500 to-orange-500", icon: "Building2" },
    STRUCTURAL: { ar: "إنشائي", en: "Structural", color: "from-blue-500 to-indigo-500", icon: "HardHat" },
    ELECTRICAL: { ar: "كهربائي", en: "Electrical", color: "from-yellow-500 to-amber-500", icon: "Zap" },
    MEP: { ar: "MEP", en: "MEP", color: "from-brand-navy-500 to-cyan-500", icon: "Settings" },
  };
  return configs[category] || configs.OVERALL;
}

// ===== Budget Utilization Bar =====
function BudgetUtilizationBar({ planned, actual, committed, ar }: { planned: number; actual: number; committed: number; ar: boolean }) {
  const tAuto = useTranslations();
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
  const commPct = planned > 0 ? Math.min((committed / planned) * 100, 100) : 0;
  const isOver = actual > planned;

  return (
    <div className="space-y-1.5">
      <div className="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {/* Committed layer */}
        <div
          className="absolute inset-y-0 start-0 h-full bg-slate-200 dark:bg-slate-700 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(commPct, 100)}%` }}
        />
        {/* Actual layer */}
        <div
          className={cn(
            "absolute inset-y-0 start-0 h-full rounded-full transition-all duration-500",
            isOver
              ? "bg-gradient-to-r from-red-400 to-red-500"
              : pct > 80
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : "bg-gradient-to-r from-brand-navy-400 to-brand-navy-500"
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {tAuto('auto.actual')}: {formatCurrency(actual, ar)}
          </span>
          <span className="text-[10px] font-mono tabular-nums text-slate-400">
            {tAuto('auto.comm')}: {formatCurrency(committed, ar)}
          </span>
        </div>
        <span className={cn(
          "text-[10px] font-bold tabular-nums",
          isOver ? "text-red-500" : pct > 80 ? "text-amber-500" : "text-brand-navy-600 dark:text-brand-navy-400"
        )}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ===== Variance Indicator =====
function VarianceIndicator({ deviation, ar: _ar }: { deviation: number; ar: boolean }) {
  const tAuto = useTranslations();
  const isPositive = deviation >= 0;
  return (
    <div className={cn(
      "flex items-center gap-1",
      isPositive ? "text-red-500" : "text-emerald-500"
    )}>
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span className="text-[10px] font-bold tabular-nums">
        {deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%
      </span>
      <span className="text-[10px] text-slate-400">{tAuto('auto.dev')}</span>
    </div>
  );
}

// ===== Main Component =====
interface BudgetsPageProps { language: "ar" | "en"; projectId?: string; }

export default function BudgetsPage({ language, projectId }: BudgetsPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const [selectedProject, setSelectedProject] = useState<string>(projectId || "");

  // Fetch projects
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => { const res = await fetch("/api/projects-simple"); if (!res.ok) return []; const json = await res.json(); return json.data || json; },
  });

  // Fetch budgets for selected project
  const { data: budgets = [], isLoading } = useQuery<BudgetItem[]>({
    queryKey: ["budgets", selectedProject],
    queryFn: async () => {
      const res = await fetch(`/api/budgets?projectId=${selectedProject}`);
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
    enabled: !!selectedProject,
  });

  // Auto-select first project if none selected
  const activeProjectId = selectedProject || (projects.length > 0 ? projects[0].id : "");
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Sort budgets by category order
  const categoryOrder = ["overall", "ARCHITECTURAL", "STRUCTURAL", "ELECTRICAL", "MEP"];
  const sortedBudgets = [...budgets].sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category);
    const bi = categoryOrder.indexOf(b.category);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Overall totals
  const totals = sortedBudgets.reduce(
    (acc, b) => ({
      planned: acc.planned + b.planned,
      actual: acc.actual + b.actual,
      committed: acc.committed + b.committed,
      remaining: acc.remaining + b.remaining,
    }),
    { planned: 0, actual: 0, committed: 0, remaining: 0 }
  );
  totals.remaining = totals.planned - totals.actual - totals.committed;
  const totalDeviation = totals.planned > 0 ? ((totals.actual - totals.planned) / totals.planned) * 100 : 0;
  const utilizationPct = totals.planned > 0 ? (totals.actual / totals.planned) * 100 : 0;

  if (!activeProjectId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.budgets')}</h2>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <PiggyBank className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
            {tAuto('auto.selectAProject')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tAuto('auto.selectAProjectToViewDetailedBudget')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xs" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="py-0 gap-0"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <PiggyBank className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.budgets')}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {tAuto('auto.trackBudgetsExpenditures')}
            </p>
          </div>
        </div>
        <Select value={activeProjectId} onValueChange={setSelectedProject} {...(projectId ? { hidden: true } : {})}>
          <SelectTrigger className={cn("w-[280px] h-9 text-sm rounded-lg", !!projectId && "hidden")}>
            <SelectValue placeholder={tAuto('auto.selectProject')} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {ar ? p.name : p.nameEn || p.name} ({p.number})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Budget Health Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Budget */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><BarChart3 className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-slate-200">{tAuto('auto.totalBudget')}</span>
            </div>
            <div className="text-lg font-bold text-white font-mono tabular-nums">{formatCurrency(totals.planned, ar)}</div>
          </div>
        </Card>

        {/* Spent */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className={cn(
            "p-4",
            utilizationPct > 100
              ? "bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700"
              : utilizationPct > 80
                ? "bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700"
                : "bg-gradient-to-br from-brand-navy-500 to-brand-navy-600 dark:from-brand-navy-600 dark:to-brand-navy-700"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Wallet className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-white/80">{tAuto('auto.spent')}</span>
            </div>
            <div className="text-lg font-bold text-white font-mono tabular-nums">{formatCurrency(totals.actual, ar)}</div>
            <p className="text-[10px] text-white/60 mt-1">{utilizationPct.toFixed(1)}% {tAuto('auto.utilized')}</p>
          </div>
        </Card>

        {/* Remaining */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className={cn(
            "p-4",
            totals.remaining < 0
              ? "bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                {totals.remaining < 0 ? <AlertTriangle className="h-3.5 w-3.5 text-white" /> : <PiggyBank className="h-3.5 w-3.5 text-white" />}
              </div>
              <span className="text-xs text-white/80">{tAuto('auto.remaining')}</span>
            </div>
            <div className="text-lg font-bold text-white font-mono tabular-nums">
              {totals.remaining < 0 ? "-" : ""}{formatCurrency(Math.abs(totals.remaining), ar)}
            </div>
          </div>
        </Card>

        {/* Committed */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><CircleDot className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-violet-100">{tAuto('auto.committed')}</span>
            </div>
            <div className="text-lg font-bold text-white font-mono tabular-nums">{formatCurrency(totals.committed, ar)}</div>
            <p className="text-[10px] text-white/60 mt-1">
              {totals.planned > 0 ? ((totals.committed / totals.planned) * 100).toFixed(1) : 0}% {tAuto('auto.committed1')}
            </p>
          </div>
        </Card>
      </div>

      {/* Overall Summary Bar */}
      <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className={cn(
            "px-6 py-4",
            totalDeviation > 10
              ? "bg-gradient-to-r from-red-500 to-rose-600"
              : totalDeviation > 0
                ? "bg-gradient-to-r from-amber-500 to-amber-600"
                : "bg-gradient-to-r from-brand-navy-500 to-cyan-600"
          )}>
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="h-5 w-5 text-white/80" />
              <span className="text-white font-bold">{tAuto('auto.overallBudgetSummary')}</span>
              {activeProject && (
                <span className="text-white/70 text-sm ms-auto">{ar ? activeProject.name : activeProject.nameEn || activeProject.name}</span>
              )}
            </div>

            {/* Budget Utilization Progress Bar */}
            <div className="mb-3">
              <div className="relative h-3 rounded-full bg-white/20 overflow-hidden">
                {/* Committed layer */}
                <div
                  className="absolute inset-y-0 start-0 h-full bg-white/30 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(totals.planned > 0 ? (totals.committed / totals.planned) * 100 : 0, 100)}%` }}
                />
                {/* Actual layer */}
                <div
                  className={cn(
                    "absolute inset-y-0 start-0 h-full rounded-full transition-all duration-500",
                    utilizationPct > 100 ? "bg-red-300" : "bg-white/80"
                  )}
                  style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/60 mt-1.5">
                <span>{tAuto('auto.planned')}: <span className="font-mono tabular-nums text-white/90">{formatCurrency(totals.planned, ar)}</span></span>
                <span>{tAuto('auto.used')}: <span className="font-mono tabular-nums text-white/90">{utilizationPct.toFixed(1)}%</span></span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div className="text-center">
                <div className="text-[10px] text-white/60">{tAuto('auto.planned')}</div>
                <div className="text-sm font-bold text-white font-mono tabular-nums">{formatCurrency(totals.planned, ar)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-white/60">{tAuto('auto.actual')}</div>
                <div className="text-sm font-bold text-white font-mono tabular-nums">{formatCurrency(totals.actual, ar)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-white/60">{tAuto('auto.committed')}</div>
                <div className="text-sm font-bold text-white font-mono tabular-nums">{formatCurrency(totals.committed, ar)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-white/60">{tAuto('auto.remaining')}</div>
                <div className={cn("text-sm font-bold font-mono tabular-nums", totals.remaining < 0 ? "text-red-200" : "text-white")}>
                  {totals.remaining < 0 ? "-" : ""}{formatCurrency(Math.abs(totals.remaining), ar)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-white/60">{tAuto('auto.deviation')}</div>
                <div className={cn("text-sm font-bold font-mono tabular-nums flex items-center justify-center gap-1", totalDeviation > 10 ? "text-red-200" : totalDeviation > 0 ? "text-amber-200" : "text-green-200")}>
                  {totalDeviation > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {totalDeviation.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Warning */}
      {totalDeviation > 10 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {tAuto('auto.warningBudgetOverrun')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">
              {ar
                ? `الميزانية الفعلية تجاوزت المخطط بنسبة ${totalDeviation.toFixed(1)}%`
                : `Actual spending exceeds planned budget by ${totalDeviation.toFixed(1)}%`}
            </p>
          </div>
        </div>
      )}

      {/* Budget Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedBudgets.map((budget) => {
          const catCfg = getCategoryConfig(budget.category);
          const isOverBudget = budget.deviation > 10;
          const isNegativeDeviation = budget.deviation > 0;
          const budgetPct = budget.planned > 0 ? (budget.actual / budget.planned) * 100 : 0;

          return (
            <Card key={budget.id} className={cn(
              "border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm",
              isOverBudget ? "ring-1 ring-red-200 dark:ring-red-900/50" : "",
              budgetPct > 100 && "bg-red-50/30 dark:bg-red-950/10"
            )}>
              <CardContent className="p-0">
                {/* Category Header */}
                <div className={cn(
                  "bg-gradient-to-r px-4 py-2.5",
                  catCfg.color,
                  isOverBudget && "from-red-500 to-rose-600"
                )}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{ar ? catCfg.ar : catCfg.en}</h3>
                    {isOverBudget && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px] h-5">
                        <AlertTriangle className="h-3 w-3 me-1" />
                        {tAuto('auto.overrun')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Budget name */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{budget.name}</p>

                  {/* Key Metrics - 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                      <div className="text-[10px] text-slate-400">{tAuto('auto.planned')}</div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono tabular-nums">{formatCurrency(budget.planned, ar)}</div>
                    </div>
                    <div className={cn(
                      "rounded-lg px-3 py-2",
                      isNegativeDeviation
                        ? "bg-red-50 dark:bg-red-950/30"
                        : "bg-slate-50 dark:bg-slate-800/50"
                    )}>
                      <div className="text-[10px] text-slate-400">{tAuto('auto.actual')}</div>
                      <div className={cn(
                        "text-sm font-bold font-mono tabular-nums",
                        isNegativeDeviation ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"
                      )}>{formatCurrency(budget.actual, ar)}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                      <div className="text-[10px] text-slate-400">{tAuto('auto.committed')}</div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">{formatCurrency(budget.committed, ar)}</div>
                    </div>
                    <div className={cn(
                      "rounded-lg px-3 py-2",
                      budget.remaining < 0
                        ? "bg-red-50 dark:bg-red-950/30"
                        : "bg-emerald-50 dark:bg-emerald-950/30"
                    )}>
                      <div className="text-[10px] text-slate-400">{tAuto('auto.remaining')}</div>
                      <div className={cn(
                        "text-sm font-bold font-mono tabular-nums",
                        budget.remaining < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {budget.remaining < 0 && <Minus className="inline h-3 w-3 me-0.5" />}
                        {formatCurrency(Math.abs(budget.remaining), ar)}
                      </div>
                    </div>
                  </div>

                  {/* Variance Indicator */}
                  <div className="flex items-center justify-between pt-1">
                    <VarianceIndicator deviation={budget.deviation} ar={ar} />
                    {isOverBudget && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                        {tAuto('auto.oVER')}
                      </span>
                    )}
                  </div>

                  {/* Budget Utilization Bar */}
                  <BudgetUtilizationBar planned={budget.planned} actual={budget.actual} committed={budget.committed} ar={ar} />

                  {/* Children (sub-budgets) - Hierarchical Display */}
                  {budget.children && budget.children.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-semibold">{tAuto('auto.breakdown')}</span>
                      </div>
                      {budget.children.map((child, idx) => {
                        const childPct = child.planned > 0 ? (child.actual / child.planned) * 100 : 0;
                        const childIsOver = child.deviation > 10;
                        return (
                          <div
                            key={child.id}
                            className={cn(
                              "rounded-lg p-2.5 ps-4",
                              idx % 2 === 0
                                ? "bg-slate-50/80 dark:bg-slate-800/30"
                                : "bg-slate-50 dark:bg-slate-800/50",
                              childIsOver && "ring-1 ring-inset ring-red-200 dark:ring-red-900/30"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                <span className="text-slate-400 me-1.5">└</span>
                                {child.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono tabular-nums text-slate-500">{formatCurrency(child.planned, ar)}</span>
                                <span className={cn(
                                  "text-[10px] font-bold font-mono tabular-nums",
                                  childIsOver ? "text-red-500" : child.deviation > 0 ? "text-amber-500" : "text-emerald-500"
                                )}>
                                  {child.deviation > 0 ? "+" : ""}{child.deviation.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            {/* Mini progress bar for child */}
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  childIsOver
                                    ? "bg-gradient-to-r from-red-400 to-red-500"
                                    : childPct > 80
                                      ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                      : "bg-gradient-to-r from-brand-navy-400 to-brand-navy-500"
                                )}
                                style={{ width: `${Math.min(childPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {sortedBudgets.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PiggyBank className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {tAuto('auto.noBudgetData')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tAuto('auto.noBudgetHasBeenCreatedForThisProjectYet')}
          </p>
        </div>
      )}
    </div>
  );
}
