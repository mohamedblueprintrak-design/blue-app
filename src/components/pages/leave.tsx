"use client";


import { useTranslations } from 'next-intl';
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/ui/status-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMutationHeaders } from "@/lib/csrf-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  CheckCircle,
  XCircle,
  HourglassIcon,
  CalendarOff,
  Filter,
  AlertTriangle,
  CalendarDays,
  BarChart3,
} from "lucide-react";

// ===== Types =====
interface LeaveRecord {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  approvedById: string | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    EMAIL: string;
    avatar: string;
    department: string;
    position: string;
  };
  approver: {
    id: string;
    name: string;
    avatar: string;
  } | null;
}

interface LeaveSummary {
  PENDING: number;
  approvedThisMonth: number;
  onLeaveToday: number;
}

interface LeaveResponse {
  records: LeaveRecord[];
  summary: LeaveSummary;
}

// ===== Helpers =====
function getLeaveTypeConfig(type: string) {
  const configs: Record<string, { ar: string; en: string; color: string; barColor: string }> = {
    ANNUAL: { ar: "سنوية", en: "Annual", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", barColor: "bg-blue-500" },
    SICK: { ar: "مرضية", en: "Sick", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", barColor: "bg-amber-500" },
    EMERGENCY: { ar: "طوارئ", en: "Emergency", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", barColor: "bg-red-500" },
    UNPAID: { ar: "بدون راتب", en: "Unpaid", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", barColor: "bg-slate-500" },
  };
  return configs[type] || configs.ANNUAL;
}

function getLeaveStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    PENDING: { ar: "معلق", en: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    APPROVED: { ar: "موافق", en: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
    REJECTED: { ar: "مرفوض", en: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  };
  return configs[status] || configs.PENDING;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n.charAt(0)).join("").toUpperCase().slice(0, 2);
}

const avatarColors = [
  "bg-brand-navy-100 dark:bg-brand-navy-900 text-brand-navy-700 dark:text-brand-navy-300",
  "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",
  "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300",
  "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// ===== Main Leave Component =====
interface LeavePageProps {
  language: "ar" | "en";
}

export default function LeavePage({ language }: LeavePageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const emptyForm = {
    employeeId: "",
    type: "ANNUAL",
    startDate: "",
    endDate: "",
    days: "1",
    reason: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch leave records
  const { data, isLoading } = useQuery<LeaveResponse>({
    queryKey: ["LEAVE", filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/leave?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leave records");
      const json = await res.json();
      // Filter by type on client side
      if (filterType !== "all") {
        json.records = json.records.filter((r: LeaveRecord) => r.type === filterType);
      }
      return json;
    },
  });

  const records = useMemo(() => data?.records || [], [data?.records]);

  // Computed stats
  const stats = useMemo(() => ({
    total: records.length,
    PENDING: records.filter(r => r.status === "PENDING").length,
    APPROVED: records.filter(r => r.status === "APPROVED").length,
    REJECTED: records.filter(r => r.status === "REJECTED").length,
  }), [records]);

  // Leave type distribution
  const typeDistribution = useMemo(() => {
    const types: Record<string, number> = {};
    records.forEach(r => {
      types[r.type] = (types[r.type] || 0) + r.days;
    });
    return types;
  }, [records]);

  const totalDays = Object.values(typeDistribution).reduce((sum, d) => sum + d, 0);

  // Leave balance cards
  const leaveBalance = useMemo(() => ({
    ANNUAL: { used: typeDistribution["ANNUAL"] || 0, total: 30, label: tAuto('auto.annual'), color: "text-blue-600 dark:text-blue-400", barColor: "bg-blue-500" },
    SICK: { used: typeDistribution["SICK"] || 0, total: 15, label: tAuto('auto.sick'), color: "text-amber-600 dark:text-amber-400", barColor: "bg-amber-500" },
    EMERGENCY: { used: typeDistribution["EMERGENCY"] || 0, total: 7, label: tAuto('auto.emergency'), color: "text-red-600 dark:text-red-400", barColor: "bg-red-500" },
  }), [typeDistribution, ar, tAuto]);

  // Calendar strip - next 14 days
  const calendarStrip = useMemo(() => {
    const days: { date: Date; dayNum: number; monthDay: string; leaveRecords: LeaveRecord[] }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayRecords = records.filter(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        return d >= start && d <= end && r.status === "APPROVED";
      });
      days.push({
        date: d,
        dayNum: d.getDate(),
        monthDay: d.toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short", day: "numeric" }),
        leaveRecords: dayRecords,
      });
    }
    return days;
  }, [records, ar]);

  // Urgent/past-due requests
  const urgentRequests = useMemo(() => {
    return records.filter(r => r.status === "PENDING").filter(r => {
      const start = new Date(r.startDate);
      const now = new Date();
      const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 2; // within 2 days or past-due
    });
  }, [records]);

  // Fetch employees for dropdown
  const { data: employeeUsers = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch("/api/users-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create leave request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["LEAVE"] });
      setShowAddDialog(false);
      setFormData(emptyForm);
    },
  });

  // Approve/Reject mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, approvedById }: { id: string; status: string; approvedById: string }) => {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status, approvedById }),
      });
      if (!res.ok) throw new Error("Failed to update leave");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["LEAVE"] });
    },
  });

  // Auto-calculate days when dates change
  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const updated = { ...formData, [field]: value };
    if (updated.startDate && updated.endDate) {
      const start = new Date(updated.startDate);
      const end = new Date(updated.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      updated.days = String(Math.max(1, diffDays));
    }
    setFormData(updated);
  };

  const summaryCards = [
    {
      label: tAuto('auto.totalRequests'),
      value: stats.total,
      icon: BarChart3,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800",
      border: "border-slate-200 dark:border-slate-700/50",
    },
    {
      label: tAuto('auto.pendingApproval'),
      value: stats.PENDING,
      icon: HourglassIcon,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800/50",
    },
    {
      label: tAuto('auto.approved'),
      value: stats.APPROVED,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800/50",
    },
    {
      label: tAuto('auto.rejected'),
      value: stats.REJECTED,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800/50",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`border ${card.border} ${card.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {card.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Type Distribution + Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leave Type Distribution */}
        <Card className="border-slate-200 dark:border-slate-700/50 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {tAuto('auto.leaveTypeDistribution')}
              </h3>
            </div>
            {totalDays > 0 ? (
              <div className="space-y-2.5">
                {Object.entries(typeDistribution).map(([type, days]) => {
                  const cfg = getLeaveTypeConfig(type);
                  const pct = Math.round((days / totalDays) * 100);
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className={`text-[10px] h-5 ${cfg.color}`}>
                          {ar ? cfg.ar : cfg.en}
                        </Badge>
                        <span className="text-[10px] text-slate-400 tabular-nums">{days} يوم ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cfg.barColor} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                {tAuto('auto.noDataAvailable')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Leave Balance Cards */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          {Object.entries(leaveBalance).map(([, balance]) => {
            const remaining = balance.total - balance.used;
            const pct = Math.min(100, Math.round((balance.used / balance.total) * 100));
            const isLow = remaining <= 3;
            return (
              <Card key={balance.label} className="border-slate-200 dark:border-slate-700/50">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{balance.label}</span>
                    {isLow && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold tabular-nums ${balance.color}`}>
                      {remaining}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {tAuto('auto.leftOf')} {balance.total}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${balance.barColor} transition-all duration-500 ${isLow ? "opacity-100" : "opacity-80"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{tAuto('auto.used')}: {balance.used}</span>
                    <span>{tAuto('auto.avail')}: {remaining}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Calendar Strip */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-brand-navy-500" />
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {tAuto('auto.approvedLeaveDays')}
            </h3>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {calendarStrip.map((day, idx) => {
              const isToday = day.date.toDateString() === new Date().toDateString();
              const hasLeave = day.leaveRecords.length > 0;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center gap-1 min-w-[52px] p-2 rounded-lg border transition-colors ${
                    isToday
                      ? "border-brand-navy-300 dark:border-brand-navy-700 bg-brand-navy-50 dark:bg-brand-navy-950/20"
                      : hasLeave
                        ? "border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20"
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="text-[10px] text-slate-400">{day.monthDay}</span>
                  <span className={`text-sm font-bold tabular-nums ${
                    isToday ? "text-brand-navy-600 dark:text-brand-navy-400" : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {day.dayNum}
                  </span>
                  {hasLeave ? (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-transparent" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Urgent Requests Banner */}
      {urgentRequests.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {ar
              ? `${urgentRequests.length} طلب(ات) عاجلة تحتاج موافقة`
              : `${urgentRequests.length} urgent request(s) need approval`}
          </p>
        </div>
      )}

      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {tAuto('auto.leaveRequests')}
          </h2>
          <Badge variant="secondary" className="text-xs">{records.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={tAuto('auto.status1')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.allStatus')}</SelectItem>
              <SelectItem value="PENDING">{tAuto('auto.pending')}</SelectItem>
              <SelectItem value="APPROVED">{tAuto('auto.approved')}</SelectItem>
              <SelectItem value="REJECTED">{tAuto('auto.rejected')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder={tAuto('auto.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.allTypes')}</SelectItem>
              <SelectItem value="ANNUAL">{tAuto('auto.annual')}</SelectItem>
              <SelectItem value="SICK">{tAuto('auto.sick')}</SelectItem>
              <SelectItem value="EMERGENCY">{tAuto('auto.emergency')}</SelectItem>
              <SelectItem value="UNPAID">{tAuto('auto.unpaid')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
            onClick={() => { setFormData(emptyForm); setShowAddDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {tAuto('auto.newRequest')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent sticky top-0 bg-white dark:bg-slate-900 z-10">
                <TableHead>{tAuto('auto.employee')}</TableHead>
                <TableHead>{tAuto('auto.type')}</TableHead>
                <TableHead className="hidden sm:table-cell">{tAuto('auto.start')}</TableHead>
                <TableHead className="hidden sm:table-cell">{tAuto('auto.end')}</TableHead>
                <TableHead className="hidden md:table-cell">{tAuto('auto.days')}</TableHead>
                <TableHead className="hidden lg:table-cell">{tAuto('auto.reason')}</TableHead>
                <TableHead>{tAuto('auto.status1')}</TableHead>
                <TableHead className="text-start">{tAuto('auto.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const typeCfg = getLeaveTypeConfig(record.type);
                const statusCfg = getLeaveStatusConfig(record.status);
                const empName = record.employee?.name || (tAuto('auto.unknown'));
                const isUrgent = urgentRequests.some(u => u.id === record.id);
                return (
                  <TableRow
                    key={record.id}
                    className={`group even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isUrgent ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={record.employee?.avatar} />
                          <AvatarFallback className={`text-[10px] font-semibold ${getAvatarColor(empName)}`}>
                            {getInitials(empName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate block">
                              {empName}
                            </span>
                            {isUrgent && (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 hidden sm:block">
                            {record.employee?.department || ""}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 ${typeCfg.color}`}>
                        {ar ? typeCfg.ar : typeCfg.en}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300">
                      {new Date(record.startDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300">
                      {new Date(record.endDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {record.days}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-slate-500 max-w-[150px] truncate">
                      {record.reason || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 flex items-center gap-1 ${statusCfg.color}`}>
                        <StatusIcon status={record.status} className="h-3 w-3" />
                        {ar ? statusCfg.ar : statusCfg.en}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-start">
                      {record.status === "PENDING" && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                            onClick={() => statusMutation.mutate({ id: record.id, status: "APPROVED", approvedById: "admin" })}
                            title={tAuto('auto.approve')}
                            aria-label="Approve"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => statusMutation.mutate({ id: record.id, status: "REJECTED", approvedById: "admin" })}
                            title={tAuto('auto.reject')}
                            aria-label="Reject"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {record.status !== "PENDING" && record.approver && (
                        <span className="text-[10px] text-slate-400">
                          {record.approver.name}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {records.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <CalendarOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {tAuto('auto.noLeaveRequestsFound')}
                  </TableCell>
                </TableRow>
              )}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    {tAuto('auto.loading')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Leave Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tAuto('auto.newLeaveRequest')}</DialogTitle>
            <DialogDescription>
              {tAuto('auto.submitANewLeaveRequest')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.employee')} *</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tAuto('auto.selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  {employeeUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.leaveType')} *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">{tAuto('auto.annual')}</SelectItem>
                  <SelectItem value="SICK">{tAuto('auto.sick')}</SelectItem>
                  <SelectItem value="EMERGENCY">{tAuto('auto.emergency')}</SelectItem>
                  <SelectItem value="UNPAID">{tAuto('auto.unpaid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.startDate')} *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleDateChange("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.endDate')} *</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleDateChange("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.days')}</Label>
              <Input
                type="number"
                min={1}
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.reason')}</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder={tAuto('auto.leaveReasonOptional')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {tAuto('auto.cancel')}
            </Button>
            <Button
              className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.startDate || !formData.endDate || createMutation.isPending}
            >
              {createMutation.isPending
                ? (tAuto('auto.submitting'))
                : (tAuto('auto.submitRequest'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
