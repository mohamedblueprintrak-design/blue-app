/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";


import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import dynamic from 'next/dynamic';

// Recharts components use ForwardRef + defaultProps which are incompatible with
// next/dynamic's generic type constraints. Using `dynamic<any>` is the standard
// workaround.
const BarChart = dynamic<any>(() => import('recharts').then((mod) => mod.BarChart as any), { ssr: false });
const Bar = dynamic<any>(() => import('recharts').then((mod) => mod.Bar as any), { ssr: false });
const XAxis = dynamic<any>(() => import('recharts').then((mod) => mod.XAxis as any), { ssr: false });
const YAxis = dynamic<any>(() => import('recharts').then((mod) => mod.YAxis as any), { ssr: false });
const CartesianGrid = dynamic<any>(() => import('recharts').then((mod) => mod.CartesianGrid as any), { ssr: false });
const Tooltip = dynamic<any>(() => import('recharts').then((mod) => mod.Tooltip as any), { ssr: false });
const ResponsiveContainer = dynamic<any>(() => import('recharts').then((mod) => mod.ResponsiveContainer as any), { ssr: false });
const Legend = dynamic<any>(() => import('recharts').then((mod) => mod.Legend as any), { ssr: false });

import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Briefcase, FileText, FileSpreadsheet, Loader2, Target, Activity, Calendar, AlertCircle, Scale, Percent } from 'lucide-react'
import { useAuthStore } from "@/store/auth-store";
import { useNavStore } from "@/store/nav-store";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { formatCurrency, formatK } from "@/lib/formatters";





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
  const tAuto = useTranslations();
  const maxAbs = data.length > 0 ? Math.max(...data.map((m) => Math.abs(m.net)), 1) : 1;

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tAuto('auto.monthlyNetCashFlow')}</h4>
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
  const tAuto = useTranslations();
  const { user } = useAuthStore();
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



  // Export handlers
  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const res = await fetch(`/api/reports/report-pdf/financial?lang=${ar ? "ar" : "en"}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
      toastFeedback.showSuccess(tAuto('auto.pDFExported'));
    } catch { toastFeedback.showError(tAuto('auto.exportFailed')); }
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
      toastFeedback.showSuccess(tAuto('auto.excelExported'));
    } catch { toastFeedback.showError(tAuto('auto.exportFailed')); }
    finally { setExporting(null); }
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

  if (!overview || !financial || !projects || projectProfitability.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[60vh]">
        <EmptyState
          titleAr="لا توجد بيانات مالية متاحة حالياً"
          titleEn="No financial data available yet"
          descriptionAr="لم تقم بإدخال أي فواتير أو حركات مالية بعد. ابدأ بإضافة فواتير أو دفعات لعرض التحليلات والتقارير المالية هنا."
          descriptionEn="You have not entered any invoices or financial movements yet. Start by adding invoices or payments to view financial analytics and reports here."
          iconName="Wallet"
          actionLabelAr="إضافة فاتورة جديدة"
          actionLabelEn="Create New Invoice"
          onAction={() => useNavStore.getState().setCurrentPage("invoices")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Welcome Section & Hijri Date */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-brand-navy-950 to-slate-900 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 -translate-y-10" />
        <div className="relative">
          <h1 className="text-xl font-bold flex items-center gap-2">
            {ar ? `👋 مرحباً بك، ${user?.name || "المحاسب المالي"}` : `👋 Welcome, ${user?.name || "Financial Manager"}`}
          </h1>
          <p className="text-xs text-indigo-200 mt-1">
            {ar ? "إليك نظرة سريعة على صحة شركتك المالية اليوم وجدول الاستحقاقات والتدفقات النقدية." : "Here is your quick summary of the company's financial health, collections, and cash flows."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 relative">
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs font-mono">
            <Calendar className="h-4 w-4 text-indigo-300" />
            <span>{new Date().toLocaleDateString(ar ? "ar-AE" : "en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white" disabled={exporting === "pdf"} onClick={handleExportPDF}>
              {exporting === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {tAuto('auto.exportPDF')}
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white" disabled={exporting === "excel"} onClick={handleExportExcel}>
              {exporting === "excel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
              {tAuto('auto.exportExcel')}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Financial Command Center Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash Balance */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{ar ? "رصيد النقدية والبنك" : "Cash & Bank Balance"}</p>
              <h3 className="text-xl font-bold font-mono mt-1.5 text-slate-900 dark:text-white">
                {formatCurrency(overview?.cashBalance ?? 0, ar)}
              </h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                <span>{ar ? "نشط وجاهز للتغطية" : "Active & liquid"}</span>
              </p>
            </div>
            <Wallet className="h-8 w-8 text-slate-400/20 shrink-0" />
          </CardContent>
        </Card>

        {/* AR Outstanding */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{ar ? "مستحق لي (AR)" : "Outstanding Receivables (AR)"}</p>
              <h3 className="text-xl font-bold font-mono mt-1.5 text-slate-900 dark:text-white">
                {formatCurrency(overview?.arOutstanding ?? 0, ar)}
              </h3>
              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{ar ? "قيد التحصيل والمتابعة" : "Under collection"}</span>
              </p>
            </div>
            <ArrowUpRight className="h-8 w-8 text-amber-500/20 shrink-0" />
          </CardContent>
        </Card>

        {/* AP Outstanding */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{ar ? "مستحق علي (AP)" : "Outstanding Payables (AP)"}</p>
              <h3 className="text-xl font-bold font-mono mt-1.5 text-slate-900 dark:text-white">
                {formatCurrency(overview?.apOutstanding ?? 0, ar)}
              </h3>
              <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                <span>{ar ? "التزامات سداد موردين" : "Supplier commitments"}</span>
              </p>
            </div>
            <ArrowDownRight className="h-8 w-8 text-rose-500/20 shrink-0" />
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{ar ? "صافي الربح" : "Net Profit"}</p>
              <h3 className="text-xl font-bold font-mono mt-1.5 text-slate-900 dark:text-white">
                {formatCurrency(pnlData.netProfit, ar)}
              </h3>
              <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                <Percent className="h-3 w-3" />
                <span>{ar ? "هامش ربح:" : "Margin:"} {pnlData.profitMargin.toFixed(1)}%</span>
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-500/20 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* 3. Core Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (Gantt Chart / Cash Flow Trend & Money Timeline) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cash Flow Chart */}
          <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30"><Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /></div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{tAuto('auto.cashFlowOverview')}</h3>
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
                    <Bar dataKey="inflow" name={tAuto('auto.inflow')} fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="outflow" name={tAuto('auto.outflow')} fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Net Trend list */}
              <NetCashFlowTrend data={cashFlowData} ar={ar} />
            </CardContent>
          </Card>

          {/* Money Timeline */}
          <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30"><Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /></div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ar ? "الخط الزمني للتحركات المالية" : "Money Timeline"}</h3>
                </div>
              </div>

              {overview?.timeline && overview.timeline.length > 0 ? (
                <div className="relative border-s border-slate-200 dark:border-slate-800 ms-3 space-y-4 py-2">
                  {overview.timeline.map((tx: any, idx: number) => (
                    <div key={idx} className="relative ps-6">
                      <div className={cn("absolute -start-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", 
                        tx.type === "INFLOW" ? "bg-emerald-500" : tx.type === "OUTFLOW" ? "bg-red-500" : "bg-amber-500"
                      )} />
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{tx.title}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(tx.date).toLocaleDateString(ar ? "ar-AE" : "en-US")}</span>
                        </div>
                        <span className={cn("text-xs font-mono font-bold shrink-0", 
                          tx.type === "INFLOW" ? "text-emerald-600 dark:text-emerald-400" : tx.type === "OUTFLOW" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          {tx.type === "INFLOW" ? "+" : tx.type === "OUTFLOW" ? "-" : ""}{formatCurrency(tx.amount, ar)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-xs text-slate-400">{ar ? "لا توجد تحركات مالية مسجلة مؤخراً" : "No recent money movements"}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Actions / Aging / Alerts) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Today's Critical Actions */}
          <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm bg-slate-50/50 dark:bg-slate-900/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/30"><AlertCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /></div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">{ar ? "تنبيهات وإجراءات عاجلة" : "Alerts & Critical Actions"}</h3>
              </div>
              <div className="space-y-2">
                {overview?.alerts?.map((alert: any, idx: number) => (
                  <div key={idx} className="flex gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border text-xs items-start shadow-xs">
                    <span className="text-rose-500">⚠️</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{ar ? alert.messageAr : alert.messageEn}</p>
                  </div>
                ))}
                {(!overview?.alerts || overview.alerts.length === 0) && (
                  <p className="text-[10px] text-slate-400 text-center py-2">{ar ? "كل شيء على ما يرام اليوم!" : "All clear for today!"}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AR Aging Mini Summary */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/30"><Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /></div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">{ar ? "تحليل أعمار الذمم المدينة" : "AR Aging Summary"}</h3>
              </div>
              {overview?.arAging ? (
                <div className="space-y-3">
                  {(() => {
                    const aging = overview.arAging;
                    const total = (aging.current + aging.days30 + aging.days60 + aging.days90) || 1;
                    const pctCurrent = (aging.current / total) * 100;
                    const pct30 = (aging.days30 / total) * 100;
                    const pct60 = (aging.days60 / total) * 100;
                    const pct90 = (aging.days90 / total) * 100;

                    return (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>{ar ? "حالي (0-30 يوم)" : "Current (0-30 days)"}</span>
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(aging.current, ar)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctCurrent}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>{ar ? "31 - 60 يوم" : "31 - 60 days"}</span>
                            <span className="font-mono font-semibold text-amber-600">{formatCurrency(aging.days30, ar)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct30}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>{ar ? "61 - 90 يوم" : "61 - 90 days"}</span>
                            <span className="font-mono font-semibold text-orange-600">{formatCurrency(aging.days60, ar)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct60}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>{ar ? "أكثر من 90 يوم" : "90+ days"}</span>
                            <span className="font-mono font-semibold text-rose-600">{formatCurrency(aging.days90, ar)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct90}%` }} />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 py-4">{ar ? "لا تتوفر تفاصيل" : "No aging details available"}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Project Profitability & Budget Utilization sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Profitability */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Briefcase className="h-4.5 w-4.5 text-emerald-600" />
              {tAuto('auto.projectProfitability')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitabilityChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: tickColor }} tickLine={false} height={30} />
                  <YAxis tickFormatter={formatK} tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip ar={ar} />} />
                  <Bar dataKey="revenue" name={tAuto('auto.revenue')} fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="cost" name={tAuto('auto.cost')} fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="profit" name={tAuto('auto.profit')} fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/30">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">{tAuto('auto.project')}</TableHead>
                    <TableHead className="text-xs font-semibold text-end">{tAuto('auto.profit')}</TableHead>
                    <TableHead className="text-xs font-semibold text-end">{tAuto('auto.margin')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectProfitability.slice(0, 5).map((p: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-medium truncate max-w-[120px]">{p.name}</TableCell>
                      <TableCell className={cn("text-xs text-end font-mono font-semibold", p.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {formatCurrency(p.profit, ar)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-xs font-semibold">{p.margin.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Budget Utilization */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="h-4.5 w-4.5 text-amber-600" />
              {tAuto('auto.budgetUtilization')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/20 p-3 rounded-lg border text-center">
              <div>
                <p className="text-[9px] text-slate-500">{tAuto('auto.totalBudget')}</p>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{formatCurrency(budgetUtilization.totalBudget, ar)}</span>
              </div>
              <div>
                <p className="text-[9px] text-slate-500">{tAuto('auto.totalSpent')}</p>
                <span className="text-xs font-bold font-mono text-amber-600">{formatCurrency(budgetUtilization.totalSpent, ar)}</span>
              </div>
              <div>
                <p className="text-[9px] text-slate-500">{tAuto('auto.remaining')}</p>
                <span className={cn("text-xs font-bold font-mono", budgetUtilization.remaining >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatCurrency(budgetUtilization.remaining, ar)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {projectProfitability.slice(0, 4).map((p: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{p.name}</span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{p.budgetUsed.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={cn("h-full rounded-full", p.budgetUsed <= 80 ? "bg-emerald-500" : p.budgetUsed <= 95 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(p.budgetUsed, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
