"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Search, ArrowUpRight, ArrowDownRight, Wallet, AlertTriangle, Download } from 'lucide-react'

import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { formatCurrency, formatK } from "@/lib/formatters";

// ===== Helpers =====
function TrendIndicator({ value, ar: _ar }: { value: number; ar: boolean }) {
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

// ===== Types =====
interface InvoiceRecord {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  remaining: number;
  status: string;
  clientId: string;
  projectId: string;
  client: { id: string; name: string; company: string };
  project: { id: string; name: string; nameEn: string; number: string };
}

interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

interface ClientOption {
  id: string;
  name: string;
  company: string;
}

// ===== Main Component =====
interface Props {
  language?: "ar" | "en";
}

export default function FinanceRevenuePage({ }: Props) {
  const lang = useLang();
  const ar = lang === "ar";
  const toastFeedback = useToastFeedback({ ar });
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
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

  // Fetch invoices for revenue data — robustly handles all API response shapes:
  // { data: [...], invoices: [...] } | { invoices: [...] } | [...] | unexpected shapes
  const { data: invoicesData, isLoading } = useQuery<InvoiceRecord[]>({
    queryKey: ["invoices-revenue"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/invoices");
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        // Try all known response shapes, then ensure we always return an array
        const items = json.data ?? json.invoices ?? (Array.isArray(json) ? json : []);
        return Array.isArray(items) ? items : [];
      } catch {
        return []; // Never let queryFn throw — return empty array on any error
      }
    },
    // Ensure data is always an array even if React Query returns stale/unexpected data
    select: (data) => Array.isArray(data) ? data : [],
  });
  const invoices = useMemo(() => Array.isArray(invoicesData) ? invoicesData : [], [invoicesData]);

  // Fetch projects
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch clients
  const { data: clientsData } = useQuery<ClientOption[]>({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json;
    },
  });
  const clients = Array.isArray(clientsData) ? clientsData : [];

  // Fetch financial overview
  const { data: _financial } = useQuery({
    queryKey: ["reports-financial"],
    queryFn: async () => {
      const res = await fetch("/api/reports/financial");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Filter invoices
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (ar ? inv.project?.name : inv.project?.nameEn || inv.project?.name)?.toLowerCase().includes(search.toLowerCase());
      const matchProject = filterProject === "all" || inv.projectId === filterProject;
      const matchClient = filterClient === "all" || inv.clientId === filterClient;
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      return matchSearch && matchProject && matchClient && matchStatus;
    });
  }, [invoices, search, filterProject, filterClient, filterStatus, ar]);

  // Summary calculations
  const now = new Date();
  const thisMonth = filtered.filter((inv) => {
    const d = new Date(inv.issueDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = filtered.filter((inv) => {
    const d = new Date(inv.issueDate);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });

  const totalRevenue = filtered.reduce((s, i) => s + i.total, 0);
  const totalOutstanding = filtered.reduce((s, i) => s + i.remaining, 0);
  const thisMonthRevenue = thisMonth.reduce((s, i) => s + i.total, 0);
  const lastMonthRevenue = lastMonth.reduce((s, i) => s + i.total, 0);
  const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  const outstandingInvoices = filtered.filter((i) => i.status === "SENT" || i.status === "PARTIALLY_PAID" || i.status === "OVERDUE");

  // Monthly revenue chart data – pre-filter active invoices as a simpler intermediate
  const activeInvoices = invoices.filter((inv) => inv.status !== "CANCELLED");
  const monthlyRevenueData = (() => {
    const months: Record<string, { monthAr: string; monthEn: string; revenue: number; collected: number }> = {};
    const arMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = { monthAr: arMonths[d.getMonth()], monthEn: enMonths[d.getMonth()], revenue: 0, collected: 0 };
    }

    activeInvoices.forEach((inv) => {
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (months[key]) {
        months[key].revenue += inv.total;
        months[key].collected += inv.paidAmount;
      }
    });

    return Object.values(months);
  })();

  // Revenue by project
  const revenueByProject = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; collected: number }> = {};
    filtered.forEach((inv) => {
      if (!inv.project) return; // Skip invoices without project data
      const name = ar ? inv.project.name : inv.project.nameEn || inv.project.name;
      if (!map[inv.projectId]) map[inv.projectId] = { name, revenue: 0, collected: 0 };
      map[inv.projectId].revenue += inv.total;
      map[inv.projectId].collected += inv.paidAmount;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, ar]);

  // Status config
  const statusConfig: Record<string, { ar: string; en: string; color: string }> = {
    DRAFT: { ar: "مسودة", en: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
    SENT: { ar: "مرسلة", en: "Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" },
    PARTIALLY_PAID: { ar: "جزئية", en: "Partial", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" },
    PAID: { ar: "مدفوعة", en: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" },
    OVERDUE: { ar: "متأخرة", en: "Overdue", color: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300" },
    CANCELLED: { ar: "ملغاة", en: "Cancelled", color: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400" },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "الإيرادات" : "Revenue"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{ar ? "متابعة الإيرادات والتحصيلات" : "Revenue & collection tracking"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ms-auto">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => {
            const exportData = revenueByProject.map((p) => ({
              [ar ? "المشروع" : "Project"]: p.name,
              [ar ? "الإيرادات" : "Revenue"]: p.revenue,
              [ar ? "المحصل" : "Collected"]: p.collected,
              [ar ? "المتبقي" : "Outstanding"]: p.revenue - p.collected,
            }));
            if (exportData.length > 0) {
              exportToCSV(exportData, ar ? "إيرادات_المشاريع" : "project_revenue");
              toastFeedback.showSuccess(ar ? "تم التصدير" : "Exported");
            }
          }}>
            <Download className="h-3.5 w-3.5" />{ar ? "تصدير CSV" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4 relative">
            <div className="absolute top-0 start-0 w-16 h-16 bg-white/5 rounded-full -translate-x-4 -translate-y-4" />
            <div className="flex items-center gap-2 mb-2 relative">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><DollarSign className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-[11px] text-emerald-100">{ar ? "إيرادات هذا الشهر" : "This Month"}</span>
            </div>
            <div className="text-lg font-bold text-white tabular-nums relative">{formatCurrency(thisMonthRevenue, ar)}</div>
            <div className="mt-1.5"><TrendIndicator value={revenueGrowth} ar={ar} /></div>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><TrendingDown className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-[11px] text-sky-100">{ar ? "الشهر الماضي" : "Last Month"}</span>
            </div>
            <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(lastMonthRevenue, ar)}</div>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Wallet className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-[11px] text-teal-100">{ar ? "إجمالي الإيرادات" : "Total Revenue"}</span>
            </div>
            <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(totalRevenue, ar)}</div>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><AlertTriangle className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-[11px] text-amber-100">{ar ? "إجمالي المتبقي" : "Total Outstanding"}</span>
            </div>
            <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(totalOutstanding, ar)}</div>
            <p className="text-[10px] text-white/60 mt-1">{outstandingInvoices.length} {ar ? "فاتورة" : "invoices"}</p>
          </div>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{ar ? "الإيرادات الشهرية" : "Monthly Revenue"}</h3>
        <p className="text-[10px] text-slate-400 mb-4">{ar ? "مقارنة الإيرادات والتحصيلات الشهرية" : "Monthly revenue vs collections"}</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenueData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey={ar ? "monthAr" : "monthEn"} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} />
              <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip ar={ar} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} />
              <Bar dataKey="revenue" name={ar ? "الإيرادات" : "Revenue"} fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="collected" name={ar ? "المحصل" : "Collected"} fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>

      {/* Revenue by Project */}
      <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm"><CardContent className="p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{ar ? "الإيرادات حسب المشروع" : "Revenue by Project"}</h3>
        <p className="text-[10px] text-slate-400 mb-4">{ar ? "توزيع الإيرادات على المشاريع" : "Revenue distribution across projects"}</p>
        <div className="space-y-3">
          {revenueByProject.slice(0, 8).map((p, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{p.name}</span>
                  <span className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white">{formatCurrency(p.revenue, ar)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
          {revenueByProject.length === 0 && (
            <p className="text-center py-6 text-xs text-slate-400">{ar ? "لا توجد بيانات" : "No data"}</p>
          )}
        </div>
      </CardContent></Card>

      {/* Outstanding Invoices */}
      <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ar ? "الفواتير غير المحصلة" : "Outstanding Invoices"}</h3>
              <p className="text-[10px] text-slate-400">{outstandingInvoices.length} {ar ? "فاتورة معلقة" : "pending invoices"}</p>
            </div>
            <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              {formatCurrency(totalOutstanding, ar)}
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "بحث..." : "Search..."} className="ps-9 h-8 text-sm rounded-lg" />
            </div>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg"><SelectValue placeholder={ar ? "المشروع" : "Project"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "كل المشاريع" : "All Projects"}</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg"><SelectValue placeholder={ar ? "العميل" : "Client"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "كل العملاء" : "All Clients"}</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
                <SelectItem value="SENT">{ar ? "مرسلة" : "Sent"}</SelectItem>
                <SelectItem value="PARTIALLY_PAID">{ar ? "جزئية" : "Partial"}</SelectItem>
                <SelectItem value="OVERDUE">{ar ? "متأخرة" : "Overdue"}</SelectItem>
                <SelectItem value="PAID">{ar ? "مدفوعة" : "Paid"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="text-xs font-semibold">{ar ? "الرقم" : "No."}</TableHead>
                    <TableHead className="text-xs font-semibold">{ar ? "العميل" : "Client"}</TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">{ar ? "المشروع" : "Project"}</TableHead>
                    <TableHead className="text-xs font-semibold text-start">{ar ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead className="text-xs font-semibold text-start">{ar ? "المدفوع" : "Paid"}</TableHead>
                    <TableHead className="text-xs font-semibold text-start">{ar ? "المتبقي" : "Remaining"}</TableHead>
                    <TableHead className="text-xs font-semibold">{ar ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingInvoices.map((inv, idx) => {
                    const sc = statusConfig[inv.status] || statusConfig.DRAFT;
                    return (
                      <TableRow key={inv.id} className={cn(idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                        <TableCell className="font-mono text-xs text-slate-500">{inv.number}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-900 dark:text-white max-w-[150px] truncate">{inv.client.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-slate-500">{ar ? inv.project.name : inv.project.nameEn || inv.project.name}</TableCell>
                        <TableCell className="text-xs text-start font-mono tabular-nums">{formatCurrency(inv.total, ar)}</TableCell>
                        <TableCell className="text-xs text-start text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(inv.paidAmount, ar)}</TableCell>
                        <TableCell className="text-xs text-start font-medium text-amber-600 dark:text-amber-400 font-mono tabular-nums">{formatCurrency(inv.remaining, ar)}</TableCell>
                        <TableCell><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>{ar ? sc.ar : sc.en}</span></TableCell>
                      </TableRow>
                    );
                  })}
                  {outstandingInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400">
                      {ar ? "لا توجد فواتير معلقة" : "No outstanding invoices"}
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Quick Total */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">{ar ? "الإجمالي المعروض" : "Total Shown"}</span>
            <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">{formatCurrency(filtered.reduce((s, i) => s + i.total, 0), ar)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
