"use client";


import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  DollarSign, TrendingUp, CheckCircle, Clock, Users,
  AlertTriangle, Briefcase, CalendarDays, BarChart3, ArrowUpRight, ArrowDownRight,
  FileText, FileSpreadsheet, Loader2, FolderKanban, UserCheck,
} from "lucide-react";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { formatCurrency, formatK } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

// ===== Helpers =====
function _TrendIndicator({ value, ar: _ar }: { value: number; ar: boolean }) {
  const isPositive = value >= 0;
  return (
    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      <span>{Math.abs(value).toFixed(1)}%</span>
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

function SimpleTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-lg">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ===== Report Type Card =====
function ReportTypeCard({ icon: Icon, title, description, count, color, active, onClick, ar: _ar }: {
  icon: typeof BarChart3; title: string; description: string; count: number; color: string; active: boolean; onClick: () => void; ar: boolean;
}) {
  const tAuto = useTranslations();
  return (
    <Card
      className={cn(
        "py-0 gap-0 cursor-pointer transition-all duration-200 border",
        active ? `${color} border-transparent shadow-lg` : "border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800")}>
            <Icon className={cn("h-5 w-5", active ? "text-white" : color.includes("emerald") ? "text-emerald-600" : color.includes("amber") ? "text-amber-600" : color.includes("sky") ? "text-sky-600" : "text-violet-600")} />
          </div>
          <div className="flex-1">
            <h3 className={cn("text-sm font-semibold mb-0.5", active ? "text-white" : "text-slate-900 dark:text-white")}>{title}</h3>
            <p className={cn("text-[11px]", active ? "text-white/70" : "text-slate-500 dark:text-slate-400")}>{description}</p>
          </div>
          <Badge variant="outline" className={cn("text-[10px] font-bold h-5", active ? "bg-white/20 text-white border-transparent" : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700")}>
            {count} {tAuto('auto.reports')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Main Component =====
interface ReportsPageProps {
  language?: "ar" | "en";
  projectId?: string;
}

export default function ReportsPage({ projectId }: ReportsPageProps) {
  const tAuto = useTranslations();
  const lang = useLang();
  const ar = lang === "ar";
  const [dateRange, setDateRange] = useState("this_year");
  const [activeTab, setActiveTab] = useState("projects");
  const [exporting, setExporting] = useState<string | null>(null);
  const toastFeedback = useToastFeedback({ ar });
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

  const buildUrl = (path: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    return `${path}${params.toString() ? `?${params.toString()}` : ""}`;
  };

  // Fetch all report data
  const { isLoading: isLoadingOverview } = useQuery({
    queryKey: ["reports-overview", projectId],
    queryFn: async () => { const res = await fetch(buildUrl("/api/reports/overview")); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const { data: financial, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ["reports-financial", projectId],
    queryFn: async () => { const res = await fetch(buildUrl("/api/reports/financial")); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["reports-projects", projectId],
    queryFn: async () => { const res = await fetch(buildUrl("/api/reports/projects")); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const { data: hr, isLoading: isLoadingHR } = useQuery({
    queryKey: ["reports-hr", projectId],
    queryFn: async () => { const res = await fetch(buildUrl("/api/reports/hr")); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  // Chart data derivations
  const revenueByClientData = useMemo(() => {
    const clients = financial?.topClients || [];
    const colors = ["#133371", "#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e"];
    return clients.slice(0, 5).map((c: { clientName: string; clientCompany: string; totalRevenue: number }, i: number) => ({
      name: c.clientName || c.clientCompany || "—", value: c.totalRevenue || 0, color: colors[i % colors.length],
    }));
  }, [financial]);

  const totalRevenueByClient = useMemo(() => revenueByClientData.reduce((s: number, d: { name: string; value: number; color: string }) => s + d.value, 0), [revenueByClientData]);

  const departmentData = useMemo(() => {
    const depts = hr?.departmentDistribution || [];
    const colors = ["#133371", "#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e", "#ec4899"];
    return depts.map((d: { department: string; count: number }, i: number) => ({
      name: d.department, value: d.count, color: colors[i % colors.length],
    }));
  }, [hr]);

  const leaveData = useMemo(() => {
    const leaves = hr?.leaveDistribution || [];
    const colors = ["#133371", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];
    return leaves.map((l: { type: string; count: number }, i: number) => ({
      name: l.type, value: l.count, color: colors[i % colors.length],
    }));
  }, [hr]);

  const dateRanges = [
    { value: "7_days", ar: "7 أيام", en: "7 Days" },
    { value: "30_days", ar: "30 يوم", en: "30 Days" },
    { value: "90_days", ar: "90 يوم", en: "90 Days" },
    { value: "this_month", ar: "هذا الشهر", en: "This Month" },
    { value: "this_year", ar: "هذا العام", en: "This Year" },
  ];

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    COMPLETED: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    DELAYED: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    CANCELLED: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  };

  // Report type cards data
  const reportTypes = [
    { key: "projects", icon: FolderKanban, title: tAuto('auto.projectReports'), desc: tAuto('auto.statusProgressDeadlines'), count: projects?.projects?.length || 0, color: "bg-emerald-600 hover:bg-emerald-700" },
    { key: "FINANCIAL", icon: DollarSign, title: tAuto('auto.financialReports'), desc: tAuto('auto.revenueExpensesInvoices'), count: financial?.topClients?.length || 0, color: "bg-amber-600 hover:bg-amber-700" },
    { key: "hr", icon: UserCheck, title: tAuto('auto.hRReports'), desc: tAuto('auto.employeesAttendanceLeave'), count: hr?.totalEmployees || 0, color: "bg-sky-600 hover:bg-sky-700" },
    { key: "clients", icon: Users, title: tAuto('auto.clientReports'), desc: tAuto('auto.topClientsRevenue'), count: financial?.topClients?.length || 0, color: "bg-violet-600 hover:bg-violet-700" },
  ];

  // Loading state
  const isLoading = isLoadingOverview || isLoadingFinancial || isLoadingProjects || isLoadingHR;
  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
            <BarChart3 className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.reports1')}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{tAuto('auto.financialOperationalPerformanceAnalysis')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ms-auto flex-wrap">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-slate-200 dark:border-slate-700 hover:bg-brand-navy-50 dark:hover:bg-brand-navy-900/20" disabled={exporting === "pdf"} onClick={async () => {
            setExporting("pdf");
            try {
              const res = await fetch(`/api/reports/report-pdf/financial?lang=${ar ? "ar" : "en"}`);
              if (!res.ok) throw new Error("Failed");
              const blob = await res.blob();
              window.open(URL.createObjectURL(blob), "_blank");
              toastFeedback.showSuccess(tAuto('auto.pDFExported'));
            } catch { toastFeedback.showError(tAuto('auto.exportFailed')); }
            finally { setExporting(null); }
          }}>
            {exporting === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {tAuto('auto.exportPDF')}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-slate-200 dark:border-slate-700 hover:bg-brand-navy-50 dark:hover:bg-brand-navy-900/20" disabled={exporting === "excel"} onClick={async () => {
            setExporting("excel");
            try {
              const res = await fetch(`/api/reports/excel?type=projects&lang=${ar ? "ar" : "en"}`);
              if (!res.ok) throw new Error("Failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `blueprint-report.xlsx`; a.click();
              URL.revokeObjectURL(url);
              toastFeedback.showSuccess(tAuto('auto.excelExported'));
            } catch { toastFeedback.showError(tAuto('auto.exportFailed')); }
            finally { setExporting(null); }
          }}>
            {exporting === "excel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            {tAuto('auto.exportExcel')}
          </Button>
          {dateRanges.map((dr) => (
            <button key={dr.value} onClick={() => setDateRange(dr.value)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", dateRange === dr.value ? "bg-brand-navy-600 text-white shadow-sm shadow-brand-navy-600/25" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700")}>
              {ar ? dr.ar : dr.en}
            </button>
          ))}
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {reportTypes.map((rt) => (
          <ReportTypeCard key={rt.key} icon={rt.icon} title={rt.title} description={rt.desc} count={rt.count} color={rt.color} active={activeTab === rt.key} onClick={() => setActiveTab(rt.key)} ar={ar} />
        ))}
      </div>

      {/* ===== PROJECT REPORTS TAB ===== */}
      {activeTab === "projects" && projects && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"><Briefcase className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.total')}</span></div>
              <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">{projects.stats?.total || 0}</div>
            </CardContent></Card>
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50"><TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.active')}</span></div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{projects.stats?.active || 0}</div>
            </CardContent></Card>
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50"><CheckCircle className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.completed')}</span></div>
              <div className="text-base font-bold text-sky-600 dark:text-sky-400 tabular-nums">{projects.stats?.completed || 0}</div>
            </CardContent></Card>
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50"><AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.delayed')}</span></div>
              <div className="text-base font-bold text-red-600 dark:text-red-400 tabular-nums">{projects.stats?.delayed || 0}</div>
            </CardContent></Card>
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50"><CalendarDays className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.onHold')}</span></div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{projects.stats?.onHold || 0}</div>
            </CardContent></Card>
          </div>

          {/* Project Progress Table */}
          <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{tAuto('auto.projectProgressOverview')}</h3>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold">{tAuto('auto.project')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.client')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.progress')}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{tAuto('auto.budget')}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{tAuto('auto.spent')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(projects.projects || []).map((p: { id: string; name: string; nameEn: string; status: string; progress: number; taskProgress: number; budget: number; totalPaid: number; clientName: string }, idx: number) => {
                  const prog = Math.max(p.progress || 0, p.taskProgress || 0);
                  const spent = p.budget > 0 ? Math.round((p.totalPaid / p.budget) * 100) : 0;
                  return (
                    <TableRow key={p.id} className={cn(idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{ar ? p.name : p.nameEn || p.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{p.clientName || "—"}</TableCell>
                      <TableCell><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", statusColors[p.status] || "")}>{p.status}</span></TableCell>
                      <TableCell><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-brand-navy-500" style={{ width: `${prog}%` }} /></div><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 tabular-nums">{prog}%</span></div></TableCell>
                      <TableCell className="text-xs text-start font-mono tabular-nums text-slate-600 dark:text-slate-400">{formatCurrency(p.budget, ar)}</TableCell>
                      <TableCell className="text-xs text-start font-mono tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(p.totalPaid, ar)} <span className="text-[9px] text-slate-400">({spent}%)</span></TableCell>
                    </TableRow>
                  );
                })}
                {(!projects.projects || projects.projects.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">{tAuto('auto.noData')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table></div>
          </CardContent></Card>

          {/* Delayed Projects */}
          {projects.projects?.filter((p: { status: string }) => p.status === "DELAYED").length > 0 && (
            <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{tAuto('auto.delayedProjects')}</h3>
              <div className="space-y-2">
                {projects.projects.filter((p: { status: string }) => p.status === "DELAYED").map((p: { id: string; name: string; nameEn: string; progress: number; taskProgress: number; endDate: string }) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                    <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /></div>
                    <div className="flex-1"><p className="text-sm font-medium text-slate-900 dark:text-white">{ar ? p.name : p.nameEn || p.name}</p></div>
                    {p.endDate && <span className="text-[10px] text-red-500 font-medium">{tAuto('auto.due1')}{new Date(p.endDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</span>}
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}

          {/* Budget vs Actual */}
          <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.budgetVsActual')}</h3>
            <p className="text-[10px] text-slate-400 mb-4">{tAuto('auto.plannedBudgetVsActualSpendingComparison')}</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(projects.projects || []).slice(0, 6).map((p: { name: string; nameEn: string; budget: number; totalPaid: number }) => ({
                  name: (ar ? p.name : p.nameEn || p.name).substring(0, 15), budget: p.budget, actual: p.totalPaid,
                }))} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip ar={ar} />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} />
                  <Bar dataKey="budget" name={tAuto('auto.budget')} fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual" name={tAuto('auto.actual')} fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* ===== FINANCIAL REPORTS TAB ===== */}
      {activeTab === "FINANCIAL" && financial && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden"><div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
              <div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><DollarSign className="h-3.5 w-3.5 text-white" /></div><span className="text-[11px] text-emerald-100">{tAuto('auto.collected')}</span></div>
              <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(financial.collectedInvoices || 0, ar)}</div>
            </div></Card>
            <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden"><div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 p-4">
              <div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Clock className="h-3.5 w-3.5 text-white" /></div><span className="text-[11px] text-amber-100">{tAuto('auto.pending')}</span></div>
              <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(financial.pendingInvoices || 0, ar)}</div>
            </div></Card>
            <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden"><div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 p-4">
              <div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><AlertTriangle className="h-3.5 w-3.5 text-white" /></div><span className="text-[11px] text-red-100">{tAuto('auto.overdue')}</span></div>
              <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(financial.overdueInvoices || 0, ar)} <span className="text-xs font-normal opacity-80">({financial.overdueCount || 0})</span></div>
            </div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Clients */}
            <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{tAuto('auto.topClientsByRevenue')}</h3>
              <Table><TableHeader><TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{tAuto('auto.client')}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{tAuto('auto.revenue')}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{tAuto('auto.collected')}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{tAuto('auto.outstanding')}</TableHead>
              </TableRow></TableHeader><TableBody>
                {(financial.topClients || []).map((c: { clientName: string; clientCompany: string; totalRevenue: number; collectedAmount: number; outstanding: number }, idx: number) => (
                  <TableRow key={c.clientName} className={cn(idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                    <TableCell><p className="text-sm font-medium text-slate-900 dark:text-white">{c.clientName}</p><p className="text-[10px] text-slate-400">{c.clientCompany}</p></TableCell>
                    <TableCell className="text-xs text-start font-mono tabular-nums">{formatCurrency(c.totalRevenue, ar)}</TableCell>
                    <TableCell className="text-xs text-start text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(c.collectedAmount, ar)}</TableCell>
                    <TableCell className="text-xs text-start text-amber-600 dark:text-amber-400 font-mono tabular-nums">{formatCurrency(c.outstanding, ar)}</TableCell>
                  </TableRow>
                ))}
                {(!financial.topClients || financial.topClients.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-6 text-xs text-slate-400">{tAuto('auto.noData')}</TableCell></TableRow>}
              </TableBody></Table>
            </CardContent></Card>

            {/* Revenue Chart */}
            <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.revenueVsExpenses')}</h3>
              <p className="text-[10px] text-slate-400 mb-4">{tAuto('auto.monthlyCashFlowAnalysis')}</p>
              <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={financial.monthlyData || []} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis dataKey={tAuto('auto.monthEn')} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} />
                  <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip ar={ar} />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} />
                  <Bar dataKey="collected" name={tAuto('auto.collected')} fill="#0e2a5c" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name={tAuto('auto.expenses')} fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            </CardContent></Card>
          </div>

          {/* Revenue by Client Pie */}
          {revenueByClientData.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.revenueByClient')}</h3>
              <p className="text-[10px] text-slate-400 mb-4">{tAuto('auto.top5ClientsByRevenue')}</p>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-full max-w-[200px] shrink-0"><ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={revenueByClientData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                    {revenueByClientData.map((entry: { name: string; value: number; color: string }, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">{formatK(totalRevenueByClient)}</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">{tAuto('auto.aED')}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {revenueByClientData.map((item: { name: string; value: number; color: string }) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                          <span className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white">{formatCurrency(item.value, ar)}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalRevenueByClient > 0 ? (item.value / totalRevenueByClient) * 100 : 0}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* ===== HR REPORTS TAB ===== */}
      {activeTab === "hr" && hr && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"><Users className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.total')}</span></div>
              <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">{hr.totalEmployees || 0}</div>
            </CardContent></Card>
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50"><CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.present')}</span></div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{hr.presentToday || 0}</div>
            </CardContent></Card>
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50"><AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.absent')}</span></div>
              <div className="text-base font-bold text-red-600 dark:text-red-400 tabular-nums">{hr.absentToday || 0}</div>
            </CardContent></Card>
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50"><Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.late')}</span></div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{hr.lateToday || 0}</div>
            </CardContent></Card>
            <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50"><CalendarDays className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /></div><span className="text-[11px] text-slate-500 dark:text-slate-400">{tAuto('auto.onLeave')}</span></div>
              <div className="text-base font-bold text-violet-600 dark:text-violet-400 tabular-nums">{hr.onLeaveToday || 0}</div>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Department Distribution */}
            {departmentData.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{tAuto('auto.departmentDistribution')}</h3>
                <div className="space-y-2">
                  {departmentData.map((d: { name: string; value: number; color: string }) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{d.name}</span>
                          <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">{d.value}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hr.totalEmployees > 0 ? (d.value / hr.totalEmployees) * 100 : 0}%`, backgroundColor: d.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            )}

            {/* Attendance Trend */}
            {hr.attendanceTrend && hr.attendanceTrend.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.attendanceTrend7Days')}</h3>
                <p className="text-[10px] text-slate-400 mb-4">{tAuto('auto.dailyAttendanceStatistics')}</p>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hr.attendanceTrend} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey={tAuto('auto.dateEn')} tick={{ fontSize: 10, fill: tickColor }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                    <Tooltip content={<SimpleTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} />
                    <Bar dataKey="PRESENT" name={tAuto('auto.present')} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="LATE" name={tAuto('auto.late')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ABSENT" name={tAuto('auto.absent')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer></div>
              </CardContent></Card>
            )}
          </div>

          {/* Leave Analysis */}
          {leaveData.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{tAuto('auto.leaveAnalysis')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {leaveData.map((l: { name: string; value: number; color: string }) => (
                  <div key={l.name} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    <div><p className="text-xs font-medium text-slate-700 dark:text-slate-300">{l.name}</p><p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{l.value}</p></div>
                  </div>
                ))}
              </div>
              {hr.pendingLeaves > 0 && (
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">{hr.pendingLeaves} {tAuto('auto.pendingLeaveRequestS')}</span>
                </div>
              )}
            </CardContent></Card>
          )}

          {/* Employees On Leave Today */}
          {hr.onLeaveEmployees && hr.onLeaveEmployees.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{tAuto('auto.employeesOnLeaveToday')}</h3>
              <Table><TableHeader><TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{tAuto('auto.name')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.department')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.position')}</TableHead>
              </TableRow></TableHeader><TableBody>
                {hr.onLeaveEmployees.map((e: { employee: { name: string; department: string; position: string } }, idx: number) => (
                  <TableRow key={e.employee?.name || idx} className={cn(idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{e.employee?.name || "—"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{e.employee?.department || "—"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{e.employee?.position || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* ===== CLIENT REPORTS TAB ===== */}
      {activeTab === "clients" && financial && (
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{tAuto('auto.clientReports')}</h3>
            <Table><TableHeader><TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold">{tAuto('auto.client')}</TableHead>
              <TableHead className="text-xs font-semibold">{tAuto('auto.company')}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{tAuto('auto.totalRevenue')}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{tAuto('auto.collected')}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{tAuto('auto.outstanding')}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{tAuto('auto.collectionRate')}</TableHead>
            </TableRow></TableHeader><TableBody>
              {(financial.topClients || []).map((c: { clientName: string; clientCompany: string; totalRevenue: number; collectedAmount: number; outstanding: number }, idx: number) => {
                const rate = c.totalRevenue > 0 ? Math.round((c.collectedAmount / c.totalRevenue) * 100) : 0;
                return (
                  <TableRow key={c.clientName} className={cn(idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{c.clientName}</TableCell>
                    <TableCell className="text-xs text-slate-500">{c.clientCompany}</TableCell>
                    <TableCell className="text-xs text-start font-mono tabular-nums">{formatCurrency(c.totalRevenue, ar)}</TableCell>
                    <TableCell className="text-xs text-start text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(c.collectedAmount, ar)}</TableCell>
                    <TableCell className="text-xs text-start text-amber-600 dark:text-amber-400 font-mono tabular-nums">{formatCurrency(c.outstanding, ar)}</TableCell>
                    <TableCell className="text-start"><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-brand-navy-500" style={{ width: `${rate}%` }} /></div><span className="text-[10px] font-bold tabular-nums">{rate}%</span></div></TableCell>
                  </TableRow>
                );
              })}
              {(!financial.topClients || financial.topClients.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">{tAuto('auto.noData')}</TableCell></TableRow>}
            </TableBody></Table>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
