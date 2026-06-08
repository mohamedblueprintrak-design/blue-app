"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import dynamic from 'next/dynamic';

// Recharts components use ForwardRef + defaultProps which are incompatible with
// next/dynamic's generic type constraints. Using `dynamic<any>` is the standard
// workaround. @ts-ignore suppresses the type mismatch that some TypeScript
// versions flag on the dynamic import return type.
// @ts-ignore — Recharts ForwardRef incompatibility with next/dynamic (known issue)
const BarChart = dynamic<any>(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
// @ts-ignore — Recharts ForwardRef incompatibility with next/dynamic (known issue)
const Bar = dynamic<any>(() => import('recharts').then((mod) => mod.Bar), { ssr: false });
// @ts-ignore — Recharts ForwardRef incompatibility with next/dynamic (known issue)
const XAxis = dynamic<any>(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
// @ts-ignore — Recharts ForwardRef incompatibility with next/dynamic (known issue)
const YAxis = dynamic<any>(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
// @ts-ignore — Recharts ForwardRef incompatibility with next/dynamic (known issue)
const CartesianGrid = dynamic<any>(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
// @ts-ignore — Recharts ForwardRef incompatibility with next/dynamic (known issue)
const Tooltip = dynamic<any>(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
// @ts-ignore — Recharts ForwardRef incompatibility with next/dynamic (known issue)
const ResponsiveContainer = dynamic<any>(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
// @ts-ignore — Recharts ForwardRef incompatibility with next/dynamic (known issue)
const Legend = dynamic<any>(() => import('recharts').then((mod) => mod.Legend), { ssr: false });

import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Briefcase, FileText, FileSpreadsheet, Loader2, Target, BarChart3, Activity } from 'lucide-react'

import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";

import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { formatCurrency, formatK } from "@/lib/formatters";

// ===== Helpers =====
function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function TrendIndicator({ value, ar: _ar }: { value: number; ar: boolean }) {
  const isPositive = value >= 0;
  return (
    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      <span>{formatPct(value)}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, ar }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; ar: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-lg">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>{p.name}: {formatCurrency(p.value, ar)}</p>
      ))}
    </div>
  );
}

// ===== Net Cash Flow Trend Component =====
function NetCashFlowTrend({ data, ar }: { data: Array<{ month: string; net: number }>; ar: boolean }) {
  const maxAbs = data.length > 0 ? Math.max(...data.map((m) => Math.abs(m.net)), 1) : 1;

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{ar ? "صافي التدفق النقدي الشهري" : "Monthly Net Cash Flow"}</h4>
      {data.map((m, idx) => {
        const pct = maxAbs > 0 ? (Math.abs(m.net) / maxAbs) * 100 : 0;
        const widthPct = Math.min(Math.max(pct, 2), 100);
        return (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-12 text-[10px] text-slate-400 shrink-0">{m.month}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {m.net >= 0 ? (
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: widthPct + "%" }} />
              ) : (
                <div className="h-full bg-red-500 rounded-full ms-auto" style={{ width: widthPct + "%" }} />
              )}
            </div>
            <span className={cn("text-[10px] font-bold font-mono tabular-nums w-24 text-end shrink-0", m.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {m.net >= 0 ? "+" : ""}{formatCurrency(m.net, ar)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ===== Main Component =====
interface Props {
  language?: "ar" | "en";
}

export default function FinanceReportsPage({ }: Props) {
  const lang = useLang();
  const ar = lang === "ar";
  const toastFeedback = useToastFeedback({ ar });
  const [exporting, setExporting] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const gridStroke = isDark ? "#334155" : "#e2e8f0";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const legendColor = isDark ? "#cbd5e1" : "#334155";

  // Fetch all financial data
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["reports-overview"],
    queryFn: async () => { const res = await fetch("/api/reports/overview"); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const { data: financial, isLoading: loadingFinancial } = useQuery({
    queryKey: ["reports-financial"],
    queryFn: async () => { const res = await fetch("/api/reports/financial"); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ["reports-projects"],
    queryFn: async () => { const res = await fetch("/api/reports/projects"); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const isLoading = loadingOverview || loadingFinancial || loadingProjects;

  // Derive P&L data
  const pnlData = useMemo(() => {
    const revenue = overview?.revenue || 0;
    const expenses = overview?.expenses || 0;
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit: profit,
      profitMargin,
      revenueGrowth: overview?.revenueGrowth || 5.2,
    };
  }, [overview]);

  // Cash flow from monthly data
  const cashFlowData = useMemo(() => {
    const months = financial?.monthlyData || [];
    return months.map((m: { monthAr: string; monthEn: string; invoiced: number; collected: number; expenses: number }) => ({
      month: ar ? m.monthAr : m.monthEn,
      inflow: m.collected || 0,
      outflow: m.expenses || 0,
      net: (m.collected || 0) - (m.expenses || 0),
    }));
  }, [financial, ar]);

  // Project profitability
  const projectProfitability = useMemo(() => {
    const projs = projects?.projects || [];
    return projs.map((p: { id: string; name: string; nameEn: string; status: string; budget: number; totalInvoiced: number; totalPaid: number; progress: number; taskProgress: number }) => {
      const revenue = p.totalInvoiced || 0;
      const cost = p.totalPaid || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return {
        name: ar ? p.name : p.nameEn || p.name,
        status: p.status,
        budget: p.budget || 0,
        revenue,
        cost,
        profit,
        margin,
        progress: Math.max(p.progress || 0, p.taskProgress || 0),
        budgetUsed: p.budget > 0 ? ((cost / p.budget) * 100) : 0,
      };
    }).sort((a: { profit: number }, b: { profit: number }) => b.profit - a.profit);
  }, [projects, ar]);

  // Budget utilization
  const budgetUtilization = useMemo(() => {
    const summary = projects?.budgetSummary || {};
    const totalBudget = summary.totalBudget || 0;
    const totalInvoiced = summary.totalInvoiced || 0;
    const totalSpent = summary.totalSpent || 0;
    const remaining = summary.remaining || totalBudget - totalSpent;
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const invoicedPct = totalBudget > 0 ? (totalInvoiced / totalBudget) * 100 : 0;

    return { totalBudget, totalInvoiced, totalSpent, remaining, utilization, invoicedPct };
  }, [projects]);

  // Profitability by project chart data
  const profitabilityChartData = useMemo(() => {
    return projectProfitability.slice(0, 6).map((p: { name: string; revenue: number; cost: number; profit: number }) => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + "…" : p.name,
      revenue: p.revenue,
      cost: p.cost,
      profit: Math.max(p.profit, 0),
    }));
  }, [projectProfitability]);

  // Budget by project chart data
  const budgetChartData = useMemo(() => {
    return projectProfitability.slice(0, 6).map((p: { name: string; budget: number; totalPaid: number; totalInvoiced: number }) => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + "…" : p.name,
      budget: p.budget,
      spent: p.totalPaid,
      invoiced: p.totalInvoiced,
    }));
  }, [projectProfitability]);

  const profitIsPositive = pnlData.netProfit >= 0;

  // Export handlers
  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const res = await fetch(`/api/reports/report-pdf/financial?lang=${ar ? "ar" : "en"}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
      toastFeedback.showSuccess(ar ? "تم تصدير PDF" : "PDF exported");
    } catch { toastFeedback.showError(ar ? "فشل التصدير" : "Export failed"); }
    finally { setExporting(null); }
  };

  const handleExportExcel = async () => {
    setExporting("excel");
    try {
      const res = await fetch(`/api/reports/excel?type=financial&lang=${ar ? "ar" : "en"}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "blueprint-financial-report.xlsx"; a.click();
      URL.revokeObjectURL(url);
      toastFeedback.showSuccess(ar ? "تم تصدير Excel" : "Excel exported");
    } catch { toastFeedback.showError(ar ? "فشل التصدير" : "Export failed"); }
    finally { setExporting(null); }
  };

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    COMPLETED: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    DELAYED: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-full" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <BarChart3 className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "التقارير المالية" : "Financial Reports"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{ar ? "تحليل مالي شامل" : "Comprehensive financial analysis"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ms-auto">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/20" disabled={exporting === "pdf"} onClick={handleExportPDF}>
            {exporting === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {ar ? "تصدير PDF" : "Export PDF"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/20" disabled={exporting === "excel"} onClick={handleExportExcel}>
            {exporting === "excel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            {ar ? "تصدير Excel" : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* ===== P&L Summary Section ===== */}
      <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30"><Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" /></div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ar ? "ملخص الأرباح والخسائر" : "Profit & Loss Summary"}</h3>
        </div>

        {/* P&L Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4 relative">
              <div className="absolute top-0 start-0 w-16 h-16 bg-white/5 rounded-full -translate-x-4 -translate-y-4" />
              <div className="flex items-center gap-2 mb-2 relative">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><DollarSign className="h-3.5 w-3.5 text-white" /></div>
                <span className="text-[11px] text-emerald-100">{ar ? "إجمالي الإيرادات" : "Total Revenue"}</span>
              </div>
              <div className="text-lg font-bold text-white tabular-nums relative">{formatCurrency(pnlData.totalRevenue, ar)}</div>
              <div className="mt-1.5"><TrendIndicator value={pnlData.revenueGrowth} ar={ar} /></div>
            </div>
          </Card>

          <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><TrendingDown className="h-3.5 w-3.5 text-white" /></div>
                <span className="text-[11px] text-red-100">{ar ? "إجمالي المصروفات" : "Total Expenses"}</span>
              </div>
              <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(pnlData.totalExpenses, ar)}</div>
            </div>
          </Card>

          <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
            <div className={cn("p-4 relative", profitIsPositive ? "bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700" : "bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700")}>
              <div className="absolute top-0 start-0 w-16 h-16 bg-white/5 rounded-full -translate-x-4 -translate-y-4" />
              <div className="flex items-center gap-2 mb-2 relative">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">{profitIsPositive ? <TrendingUp className="h-3.5 w-3.5 text-white" /> : <TrendingDown className="h-3.5 w-3.5 text-white" />}</div>
                <span className="text-[11px] text-white/80">{ar ? "صافي الربح" : "Net Profit"}</span>
              </div>
              <div className="text-lg font-bold text-white tabular-nums relative">{formatCurrency(pnlData.netProfit, ar)}</div>
            </div>
          </Card>

          <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50"><Target className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /></div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{ar ? "هامش الربح" : "Profit Margin"}</span>
              </div>
              <div className={cn("text-xl font-bold tabular-nums", pnlData.profitMargin >= 20 ? "text-emerald-600 dark:text-emerald-400" : pnlData.profitMargin >= 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                {pnlData.profitMargin.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* P&L Breakdown Table */}
        <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold">{ar ? "البند" : "Item"}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{ar ? "المبلغ" : "Amount"}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{ar ? "النسبة" : "% of Revenue"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-white dark:bg-slate-900">
                <TableCell className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{ar ? "إجمالي الإيرادات" : "Total Revenue"}</TableCell>
                <TableCell className="text-sm text-start font-bold font-mono tabular-nums text-slate-900 dark:text-white">{formatCurrency(pnlData.totalRevenue, ar)}</TableCell>
                <TableCell className="text-sm text-start font-mono tabular-nums text-slate-600 dark:text-slate-400">100%</TableCell>
              </TableRow>
              <TableRow className="bg-slate-50/50 dark:bg-slate-800/20">
                <TableCell className="text-sm font-medium text-red-600 dark:text-red-400">{ar ? "إجمالي المصروفات" : "Total Expenses"}</TableCell>
                <TableCell className="text-sm text-start font-bold font-mono tabular-nums text-slate-900 dark:text-white">({formatCurrency(pnlData.totalExpenses, ar)})</TableCell>
                <TableCell className="text-sm text-start font-mono tabular-nums text-red-600 dark:text-red-400">
                  {pnlData.totalRevenue > 0 ? ((pnlData.totalExpenses / pnlData.totalRevenue) * 100).toFixed(1) : "0"}%
                </TableCell>
              </TableRow>
              <TableRow className="bg-white dark:bg-slate-900">
                <TableCell className="text-sm font-bold text-slate-900 dark:text-white">{ar ? "صافي الربح" : "Net Profit"}</TableCell>
                <TableCell className={cn("text-sm text-start font-bold font-mono tabular-nums", profitIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {formatCurrency(pnlData.netProfit, ar)}
                </TableCell>
                <TableCell className={cn("text-sm text-start font-bold font-mono tabular-nums", profitIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {pnlData.profitMargin.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>

      {/* ===== Cash Flow Overview ===== */}
      <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/30"><Wallet className="h-4 w-4 text-sky-600 dark:text-sky-400" /></div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ar ? "نظرة عامة على التدفق النقدي" : "Cash Flow Overview"}</h3>
        </div>
        <p className="text-[10px] text-slate-400 mb-4">{ar ? "التدفقات النقدية الداخلة والخارجة شهرياً" : "Monthly cash inflows vs outflows"}</p>

        {/* Cash flow summary badges */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">{ar ? "إجمالي التدفقات الداخلة" : "Total Inflow"}</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(financial?.collectedInvoices || 0, ar)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
            <ArrowDownRight className="h-3 w-3 text-red-600" />
            <span className="text-[11px] text-red-700 dark:text-red-300">{ar ? "إجمالي التدفقات الخارجة" : "Total Outflow"}</span>
            <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">{formatCurrency(cashFlowData.reduce((s: number, m: { outflow: number }) => s + m.outflow, 0), ar)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
            <Wallet className="h-3 w-3 text-teal-600" />
            <span className="text-[11px] text-teal-700 dark:text-teal-300">{ar ? "صافي التدفق" : "Net Cash Flow"}</span>
            <span className={cn("text-xs font-bold font-mono tabular-nums", (financial?.collectedInvoices || 0) >= cashFlowData.reduce((s: number, m: { outflow: number }) => s + m.outflow, 0) ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400")}>
              {formatCurrency((financial?.collectedInvoices || 0) - cashFlowData.reduce((s: number, m: { outflow: number }) => s + m.outflow, 0), ar)}
            </span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} />
              <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip ar={ar} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} />
              <Bar dataKey="inflow" name={ar ? "تدفقات داخلة" : "Inflow"} fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="outflow" name={ar ? "تدفقات خارجة" : "Outflow"} fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net cash flow trend */}
        <NetCashFlowTrend data={cashFlowData} ar={ar} />
      </CardContent></Card>

      {/* ===== Project Profitability ===== */}
      <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30"><Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ar ? "ربحية المشاريع" : "Project Profitability"}</h3>
        </div>
        <p className="text-[10px] text-slate-400 mb-4">{ar ? "تحليل ربحية كل مشروع" : "Profitability analysis per project"}</p>

        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profitabilityChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} angle={-15} textAnchor="end" height={50} />
              <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip ar={ar} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} />
              <Bar dataKey="revenue" name={ar ? "الإيرادات" : "Revenue"} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name={ar ? "التكلفة" : "Cost"} fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name={ar ? "الربح" : "Profit"} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profitability Table */}
        <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold">{ar ? "المشروع" : "Project"}</TableHead>
                <TableHead className="text-xs font-semibold">{ar ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{ar ? "الإيرادات" : "Revenue"}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{ar ? "التكلفة" : "Cost"}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{ar ? "الربح" : "Profit"}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{ar ? "هامش الربح" : "Margin"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectProfitability.map((p: { name: string; status: string; revenue: number; cost: number; profit: number; margin: number }, idx: number) => (
                <TableRow key={idx} className={cn(idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</TableCell>
                  <TableCell><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", statusColors[p.status] || "")}>{p.status}</span></TableCell>
                  <TableCell className="text-xs text-start font-mono tabular-nums">{formatCurrency(p.revenue, ar)}</TableCell>
                  <TableCell className="text-xs text-start font-mono tabular-nums">{formatCurrency(p.cost, ar)}</TableCell>
                  <TableCell className={cn("text-xs text-start font-bold font-mono tabular-nums", p.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {formatCurrency(p.profit, ar)}
                  </TableCell>
                  <TableCell className="text-start">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className={cn("h-full rounded-full", p.margin >= 20 ? "bg-emerald-500" : p.margin >= 0 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(Math.abs(p.margin), 100)}%` }} />
                      </div>
                      <span className={cn("text-[10px] font-bold tabular-nums", p.margin >= 20 ? "text-emerald-600" : p.margin >= 0 ? "text-amber-600" : "text-red-600")}>{p.margin.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {projectProfitability.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">{ar ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>

      {/* ===== Budget Utilization ===== */}
      <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Target className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ar ? "استخدام الميزانية" : "Budget Utilization"}</h3>
        </div>
        <p className="text-[10px] text-slate-400 mb-4">{ar ? "متابعة استهلاك الميزانية للمشاريع" : "Track project budget consumption"}</p>

        {/* Overall Budget Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{ar ? "إجمالي الميزانية" : "Total Budget"}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">{formatCurrency(budgetUtilization.totalBudget, ar)}</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{ar ? "إجمالي الفوتر" : "Total Invoiced"}</p>
            <p className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono tabular-nums">{formatCurrency(budgetUtilization.totalInvoiced, ar)}</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{ar ? "إجمالي المصروف" : "Total Spent"}</p>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">{formatCurrency(budgetUtilization.totalSpent, ar)}</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{ar ? "المتبقي" : "Remaining"}</p>
            <p className={cn("text-sm font-bold font-mono tabular-nums", budgetUtilization.remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {formatCurrency(budgetUtilization.remaining, ar)}
            </p>
          </div>
        </div>

        {/* Budget utilization bars */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{ar ? "استهلاك الميزانية الإجمالي" : "Overall Budget Consumption"}</span>
            <span className={cn("text-xs font-bold tabular-nums", budgetUtilization.utilization <= 80 ? "text-emerald-600" : budgetUtilization.utilization <= 95 ? "text-amber-600" : "text-red-600")}>
              {budgetUtilization.utilization.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", budgetUtilization.utilization <= 80 ? "bg-emerald-500" : budgetUtilization.utilization <= 95 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(budgetUtilization.utilization, 100)}%` }} />
          </div>
        </div>

        {/* Budget chart */}
        {budgetChartData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetChartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} angle={-15} textAnchor="end" height={50} />
                <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip ar={ar} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} />
                <Bar dataKey="budget" name={ar ? "الميزانية" : "Budget"} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="invoiced" name={ar ? "الفوتر" : "Invoiced"} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name={ar ? "المصروف" : "Spent"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per-project budget bars */}
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{ar ? "استهلاك الميزانية حسب المشروع" : "Budget Consumption by Project"}</h4>
          {projectProfitability.map((p: { name: string; budget: number; totalPaid: number; budgetUsed: number }, idx: number) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{formatCurrency(p.totalPaid, ar)} {ar ? "من" : "of"} {formatCurrency(p.budget, ar)}</span>
                  <span className={cn("text-[10px] font-bold tabular-nums w-10 text-end", p.budgetUsed <= 80 ? "text-emerald-600" : p.budgetUsed <= 95 ? "text-amber-600" : "text-red-600")}>
                    {p.budgetUsed.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", p.budgetUsed <= 80 ? "bg-emerald-500" : p.budgetUsed <= 95 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(p.budgetUsed, 100)}%` }} />
              </div>
            </div>
          ))}
          {projectProfitability.length === 0 && (
            <p className="text-center py-4 text-xs text-slate-400">{ar ? "لا توجد مشاريع" : "No projects"}</p>
          )}
        </div>
      </CardContent></Card>
    </div>
  );
}
