"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// ===== Types =====
interface CategoryComparison {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  variancePercent: number;
  status: "on_track" | "at_risk" | "over_budget";
}

interface MonthlyComparison {
  month: string;
  budgeted: number;
  spent: number;
}

interface BudgetAlert {
  type: "over_budget" | "at_risk" | "info";
  category: string;
  message: string;
}

interface BudgetComparisonData {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  variancePercent: number;
  categories: CategoryComparison[];
  monthly: MonthlyComparison[];
  alerts: BudgetAlert[];
}

// ===== Category Label Helper =====
function getCategoryLabel(category: string, isAr: boolean): string {
  const labels: Record<string, { ar: string; en: string }> = {
    overall: { ar: "إجمالي", en: "Overall" },
    architectural: { ar: "المعماري", en: "Architectural" },
    structural: { ar: "الإنشائي", en: "Structural" },
    electrical: { ar: "الكهربائي", en: "Electrical" },
    mep: { ar: "ميكانيك وكهرباء", en: "MEP" },
    mep_electrical: { ar: "ميكانيك وكهرباء - كهرباء", en: "MEP Electrical" },
    mep_plumbing: { ar: "ميكانيك وكهرباء - سباكة", en: "MEP Plumbing" },
    civil: { ar: "أشغال مدنية", en: "Civil Works" },
    finishing: { ar: "تشطيبات", en: "Finishing" },
    general: { ar: "عام", en: "General" },
    design: { ar: "التصميم", en: "Design" },
    materials: { ar: "المواد", en: "Materials" },
    labor: { ar: "العمالة", en: "Labor" },
    permits: { ar: "التراخيص", en: "Permits" },
    supervision: { ar: "الإشراف", en: "Supervision" },
  };
  const label = labels[category.toLowerCase()];
  if (label) return isAr ? label.ar : label.en;
  // Fallback: capitalize the category
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ");
}

function getStatusConfig(status: string) {
  switch (status) {
    case "on_track":
      return {
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        border: "border-emerald-200 dark:border-emerald-800/40",
        progressColor: "bg-emerald-500",
        labelKey: "auto.budgetStatusOnTrack",
        icon: CheckCircle2,
      };
    case "at_risk":
      return {
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-200 dark:border-amber-800/40",
        progressColor: "bg-amber-500",
        labelKey: "auto.budgetStatusAtRisk",
        icon: AlertTriangle,
      };
    case "over_budget":
      return {
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-900/30",
        border: "border-red-200 dark:border-red-800/40",
        progressColor: "bg-red-500",
        labelKey: "auto.budgetStatusOverBudget",
        icon: TrendingDown,
      };
    default:
      return {
        color: "text-slate-500",
        bg: "bg-slate-100 dark:bg-slate-800",
        border: "border-slate-200 dark:border-slate-700",
        progressColor: "bg-slate-400",
        labelKey: "",
        icon: CheckCircle2,
      };
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ===== Main Component =====
interface BudgetComparisonTabProps {
  projectId: string;
  language: "ar" | "en";
}

export default function BudgetComparisonTab({ projectId, language }: BudgetComparisonTabProps) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const tAuto = useTranslations();

  const { data: comparison, isLoading } = useQuery<BudgetComparisonData>({
    queryKey: ["budget-comparison", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/budget-comparison`);
      if (!res.ok) throw new Error("Failed to fetch budget comparison");
      return res.json();
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
        <Wallet className="h-12 w-12 mb-3" />
        <p className="text-sm font-medium">{t("لا توجد بيانات ميزانية", "No budget data available")}</p>
      </div>
    );
  }

  const spentPercent = comparison.totalBudget > 0
    ? Math.round((comparison.totalSpent / comparison.totalBudget) * 100)
    : 0;

  // Find max monthly value for chart scaling
  const maxMonthly = comparison.monthly.reduce(
    (max, m) => Math.max(max, m.budgeted, m.spent),
    1
  );

  return (
    <div className="space-y-4">
      {/* ===== Overview Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Budget */}
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-brand-navy-600 dark:text-brand-navy-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("إجمالي الميزانية", "Total Budget")}</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(comparison.totalBudget)}
                  <span className="text-[10px] font-normal text-slate-400 ms-1">AED</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("إجمالي المصروف", "Total Spent")}</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(comparison.totalSpent)}
                  <span className="text-[10px] font-normal text-slate-400 ms-1">AED</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining */}
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                comparison.totalRemaining >= 0
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              )}>
                {comparison.totalRemaining >= 0
                  ? <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  : <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                }
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("المتبقي", "Remaining")}</p>
                <p className={cn(
                  "text-lg font-bold tabular-nums",
                  comparison.totalRemaining >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrency(Math.abs(comparison.totalRemaining))}
                  <span className="text-[10px] font-normal ms-1">
                    {comparison.totalRemaining < 0
                      ? t("تجاوز", "over")
                      : "AED"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variance % */}
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                comparison.variancePercent >= 0
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              )}>
                {comparison.variancePercent >= 0
                  ? <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  : <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                }
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("نسبة الانحراف", "Variance %")}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={cn(
                    "text-lg font-bold tabular-nums",
                    comparison.variancePercent >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {comparison.variancePercent >= 0 ? "+" : ""}{comparison.variancePercent}%
                  </p>
                  <Progress
                    value={spentPercent}
                    className={cn(
                      "h-2 flex-1",
                      spentPercent > 100 ? "[&>div]:bg-red-500" :
                      spentPercent >= 80 ? "[&>div]:bg-amber-500" :
                      "[&>div]:bg-emerald-500"
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Category Breakdown ===== */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-brand-navy-500" />
            {t("تفصيل الميزانية حسب الفئة", "Budget Breakdown by Category")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparison.categories.map((cat) => {
              const statusConf = getStatusConfig(cat.status);
              const StatusIcon = statusConf.icon;
              const pct = cat.budgeted > 0 ? Math.min(Math.round((cat.spent / cat.budgeted) * 100), 100) : 0;

              return (
                <div key={cat.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {getCategoryLabel(cat.category, isAr)}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] h-5 border-0 px-2", statusConf.bg, statusConf.color)}>
                        <StatusIcon className="h-3 w-3 me-1" />
                        {statusConf.labelKey ? tAuto(statusConf.labelKey) : status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatCurrency(cat.spent)} / {formatCurrency(cat.budgeted)} AED
                      </span>
                      <span className={cn("font-semibold", cat.variancePercent >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {cat.variancePercent >= 0 ? "+" : ""}{cat.variancePercent}%
                      </span>
                    </div>
                  </div>
                  <div className="relative w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", statusConf.progressColor)}
                      style={{ width: `${pct}%` }}
                    />
                    {pct > 100 && (
                      <div
                        className="absolute top-0 h-full bg-red-300 dark:bg-red-700 rounded-e-full"
                        style={{ left: "100%", width: `${Math.min(pct - 100, 50)}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {comparison.categories.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t("لا توجد بنود ميزانية", "No budget items defined")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Monthly Comparison Chart ===== */}
      {comparison.monthly.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-navy-500" />
              {t("الميزانية مقابل الفعلي - شهرياً", "Budget vs Actual — Monthly")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.monthly.map((m) => {
                const budgetPct = maxMonthly > 0 ? (m.budgeted / maxMonthly) * 100 : 0;
                const spentPct = maxMonthly > 0 ? (m.spent / maxMonthly) * 100 : 0;
                const isOver = m.spent > m.budgeted;

                return (
                  <div key={m.month} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{m.month}</span>
                      <div className="flex items-center gap-3 text-[10px] tabular-nums">
                        <span className="text-brand-navy-600 dark:text-brand-navy-400">
                          {t("مخطط", "Plan")}: {formatCurrency(m.budgeted)}
                        </span>
                        <span className={isOver ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}>
                          {t("فعلي", "Actual")}: {formatCurrency(m.spent)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-navy-400/60 transition-all duration-500" style={{ width: `${budgetPct}%` }} />
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", isOver ? "bg-red-400" : "bg-amber-400")}
                          style={{ width: `${spentPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-brand-navy-400/60" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{t("المخطط", "Budgeted")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-400" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{t("الفعلي", "Actual")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-400" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{t("تجاوز", "Over Budget")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Alerts ===== */}
      {comparison.alerts.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t("تنبيهات الميزانية", "Budget Alerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    alert.type === "over_budget"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40"
                      : alert.type === "at_risk"
                      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    alert.type === "over_budget"
                      ? "bg-red-100 dark:bg-red-900/40"
                      : alert.type === "at_risk"
                      ? "bg-amber-100 dark:bg-amber-900/40"
                      : "bg-slate-100 dark:bg-slate-800"
                  )}>
                    {alert.type === "over_budget" ? (
                      <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    ) : alert.type === "at_risk" ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-semibold",
                      alert.type === "over_budget"
                        ? "text-red-700 dark:text-red-400"
                        : alert.type === "at_risk"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-slate-600 dark:text-slate-400"
                    )}>
                      {alert.type === "over_budget"
                        ? t("تجاوز الميزانية", "Over Budget")
                        : alert.type === "at_risk"
                        ? t("في خطر", "At Risk")
                        : t("معلومة", "Info")}
                      {" — "}
                      <span className="font-normal">{getCategoryLabel(alert.category, isAr)}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
