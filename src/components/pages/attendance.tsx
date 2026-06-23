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
import { Plus, UserCheck, Clock, CalendarOff, Filter, Calendar, Timer, Monitor } from 'lucide-react'

// ===== Types =====
interface AttendanceEmployee {
  user: {
    id: string;
    name: string;
    EMAIL: string;
    avatar: string;
    department: string;
    position: string;
  };
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workHours: number;
  overtimeHours: number;
  employee: AttendanceEmployee;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  leave: number;
  totalEmployees: number;
  PRESENT?: number;
  ABSENT?: number;
  LATE?: number;
  LEAVE?: number;
}

interface AttendanceResponse {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
}

interface EmployeeOption {
  id: string;
  name: string;
  EMAIL: string;
}

// ===== Helpers =====
const _statusDotColors: Record<string, string> = {
  PRESENT: "bg-green-500",
  ABSENT: "bg-red-500",
  LATE: "bg-amber-500",
  LEAVE: "bg-blue-500",
};

function getAttendanceStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    PRESENT: { ar: "حاضر", en: "Present", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
    ABSENT: { ar: "غائب", en: "Absent", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
    LATE: { ar: "متأخر", en: "Late", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    LEAVE: { ar: "إجازة", en: "Leave", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  };
  return configs[status] || configs.PRESENT;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n.charAt(0)).join("").toUpperCase().slice(0, 2);
}

const avatarColors = [
  "bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300",
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

const dayNamesAr = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ===== Main Attendance Component =====
interface AttendancePageProps {
  language: "ar" | "en";
}

export default function AttendancePage({ language }: AttendancePageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const emptyForm = {
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    checkIn: "08:00",
    checkOut: "17:00",
    status: "PRESENT",
    workHours: "8",
    overtimeHours: "0",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Today's date
  const today = useMemo(() => {
    const d = new Date();
    return {
      display: d.toLocaleDateString(ar ? "ar-AE" : "en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      dayOfWeek: d.getDay(),
    };
  }, [ar]);

  // Fetch attendance
  const { data, isLoading } = useQuery<AttendanceResponse>({
    queryKey: ["attendance", filterEmployee, filterDateFrom, filterDateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterEmployee !== "all") params.set("employeeId", filterEmployee);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });

  const records = useMemo(() => data?.records || [], [data?.records]);
  const summary = useMemo(() => {
    const s = data?.summary;
    return {
      present: s?.present ?? s?.PRESENT ?? 0,
      absent: s?.absent ?? s?.ABSENT ?? 0,
      late: s?.late ?? s?.LATE ?? 0,
      leave: s?.leave ?? s?.LEAVE ?? 0,
      totalEmployees: s?.totalEmployees ?? 0,
    };
  }, [data?.summary]);

  // Fetch employees for dropdown
  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) return [];
      const json = await res.json();
      const emps = json.data || json.employees || json;
      if (!Array.isArray(emps)) return [];
      return emps.map((e: { id: string; user: { name: string; email: string } }) => ({
        id: e.id,
        name: e.user?.name || "",
        EMAIL: e.user?.email || "",
      }));
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create attendance");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setShowAddDialog(false);
      setFormData(emptyForm);
    },
  });

  // Weekly heatmap data - generate from records
  const weeklyHeatmap = useMemo(() => {
    const days: { day: string; counts: Record<string, number> }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (today.dayOfWeek - i));
      const dayStr = ar ? dayNamesAr[i] : dayNamesEn[i];
      const dayRecords = records.filter(r => {
        const rd = new Date(r.date);
        return rd.toDateString() === d.toDateString();
      });
      days.push({
        day: dayStr,
        counts: {
          present: dayRecords.filter(r => r.status === "PRESENT").length,
          late: dayRecords.filter(r => r.status === "LATE").length,
          absent: dayRecords.filter(r => r.status === "ABSENT").length,
          leave: dayRecords.filter(r => r.status === "LEAVE").length,
        },
      });
    }
    return days;
  }, [records, today.dayOfWeek, ar]);

  const summaryCards = [
    {
      label: tAuto('auto.presentToday'),
      value: summary.present,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800/50",
      dotColor: "bg-green-500",
    },
    {
      label: tAuto('auto.lateArrivals'),
      value: summary.late,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800/50",
      dotColor: "bg-amber-500",
    },
    {
      label: tAuto('auto.onLeave'),
      value: summary.leave,
      icon: CalendarOff,
      color: "bg-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800/50",
      dotColor: "bg-blue-500",
    },
  ];

  // Today's timeline records
  const todayRecords = useMemo(() => {
    const todayStr = new Date().toDateString();
    return records
      .filter(r => new Date(r.date).toDateString() === todayStr && (r.status === "PRESENT" || r.status === "LATE"))
      .sort((a, b) => (a.checkIn || "").localeCompare(b.checkIn || ""));
  }, [records]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`border ${card.border} ${card.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg} border ${card.border}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <span className={`absolute -top-0.5 -end-0.5 w-3 h-3 rounded-full ${card.dotColor} ring-2 ring-white dark:ring-slate-900`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
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

      {/* Today's Date Header */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-l from-teal-50 to-sky-50 dark:from-teal-950/20 dark:to-sky-950/20 border border-teal-100 dark:border-teal-900/30">
        <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{today.display}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {ar
              ? `${summary.present} حاضر من أصل ${summary.totalEmployees}`
              : `${summary.present} present out of ${summary.totalEmployees}`}
          </p>
        </div>
      </div>

      {/* Weekly Heatmap */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            {tAuto('auto.weeklyOverview')}
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {weeklyHeatmap.map((day) => (
              <div key={day.day} className="text-center space-y-1.5">
                <p className="text-[10px] font-medium text-slate-400">{day.day}</p>
                <div className="space-y-0.5">
                  {(day.counts.present > 0 || day.counts.late > 0 || day.counts.absent > 0 || day.counts.leave > 0) ? (
                    <div className="flex flex-col gap-0.5 items-center">
                      {day.counts.present > 0 && (
                        <span className="w-full h-5 rounded bg-green-100 dark:bg-green-900/40 text-[9px] text-green-700 dark:text-green-400 flex items-center justify-center font-medium">
                          {day.counts.present}
                        </span>
                      )}
                      {day.counts.late > 0 && (
                        <span className="w-full h-5 rounded bg-amber-100 dark:bg-amber-900/40 text-[9px] text-amber-700 dark:text-amber-400 flex items-center justify-center font-medium">
                          {day.counts.late}
                        </span>
                      )}
                      {day.counts.absent > 0 && (
                        <span className="w-full h-5 rounded bg-red-100 dark:bg-red-900/40 text-[9px] text-red-700 dark:text-red-400 flex items-center justify-center font-medium">
                          {day.counts.absent}
                        </span>
                      )}
                      {day.counts.leave > 0 && (
                        <span className="w-full h-5 rounded bg-blue-100 dark:bg-blue-900/40 text-[9px] text-blue-700 dark:text-blue-400 flex items-center justify-center font-medium">
                          {day.counts.leave}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="w-full h-5 rounded bg-slate-50 dark:bg-slate-800/50 text-[9px] text-slate-300 dark:text-slate-600 flex items-center justify-center">
                      —
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {[
              { color: "bg-green-500", label: tAuto('auto.present') },
              { color: "bg-amber-500", label: tAuto('auto.late') },
              { color: "bg-red-500", label: tAuto('auto.absent') },
              { color: "bg-blue-500", label: tAuto('auto.leave') },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-[10px] text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Timeline View */}
      {todayRecords.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="h-4 w-4 text-teal-500" />
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {tAuto('auto.todaySTimeline')}
              </h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todayRecords.map((rec) => {
                const empName = rec.employee?.user?.name || (tAuto('auto.unknown'));
                const isLate = rec.status === "LATE";
                return (
                  <div key={rec.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-end min-w-[50px]">
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{rec.checkIn || "—"}</span>
                      <span className="text-slate-300 mx-1">→</span>
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{rec.checkOut || "—"}</span>
                    </div>
                    <StatusIcon status={rec.status} className="h-3 w-3" />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className={`text-[8px] font-semibold ${getAvatarColor(empName)}`}>
                          {getInitials(empName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                        {empName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] tabular-nums text-slate-500">{rec.workHours}h</span>
                      {isLate && (
                        <Badge variant="secondary" className="text-[9px] h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          {tAuto('auto.late')}
                        </Badge>
                      )}
                      {rec.overtimeHours > 0 && (
                        <Badge variant="secondary" className="text-[9px] h-4 bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                          +{rec.overtimeHours}h
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {tAuto('auto.attendanceRecords')}
          </h2>
          <Badge variant="secondary" className="text-xs">{records.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={tAuto('auto.employee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.allEmployees')}</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-[140px] h-8 text-xs"
            placeholder={tAuto('auto.from')}
          />
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-[140px] h-8 text-xs"
            placeholder={tAuto('auto.to')}
          />
          {(filterEmployee !== "all" || filterDateFrom || filterDateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-500"
              onClick={() => { setFilterEmployee("all"); setFilterDateFrom(""); setFilterDateTo(""); }}
            >
              {tAuto('auto.clear')}
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { setFormData(emptyForm); setShowAddDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {tAuto('auto.addRecord')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{tAuto('auto.employee')}</TableHead>
              <TableHead>{tAuto('auto.date')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tAuto('auto.checkIn')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tAuto('auto.checkOut')}</TableHead>
              <TableHead>{tAuto('auto.status1')}</TableHead>
              <TableHead className="hidden md:table-cell">{tAuto('auto.workHrs')}</TableHead>
              <TableHead className="hidden md:table-cell">{tAuto('auto.overtime')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const statusCfg = getAttendanceStatusConfig(record.status);
              const empName = record.employee?.user?.name || (tAuto('auto.unknown'));
              return (
                <TableRow key={record.id} className="group even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={record.employee?.user?.avatar} />
                        <AvatarFallback className={`text-[10px] font-semibold ${getAvatarColor(empName)}`}>
                          {getInitials(empName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate block">
                          {empName}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:block">
                          {record.employee?.user?.department || ""}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                    {new Date(record.date).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300 font-mono">
                    {record.checkIn || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300 font-mono">
                    {record.checkOut || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={record.status} className="h-3 w-3" />
                      <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 flex items-center gap-1 ${statusCfg.color}`}>
                        {ar ? statusCfg.ar : statusCfg.en}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-300">
                    {record.workHours > 0 ? `${record.workHours}h` : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-300">
                    {record.overtimeHours > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">+{record.overtimeHours}h</span>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {records.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  {tAuto('auto.noAttendanceRecordsFound')}
                </TableCell>
              </TableRow>
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  {tAuto('auto.loading')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Attendance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tAuto('auto.newAttendanceRecord')}</DialogTitle>
            <DialogDescription>
              {tAuto('auto.recordEmployeeAttendance')}
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
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.date')} *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.checkIn')}</Label>
                <Input
                  type="time"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.checkOut')}</Label>
                <Input
                  type="time"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.status1')}</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">{tAuto('auto.present')}</SelectItem>
                  <SelectItem value="ABSENT">{tAuto('auto.absent')}</SelectItem>
                  <SelectItem value="LATE">{tAuto('auto.late')}</SelectItem>
                  <SelectItem value="LEAVE">{tAuto('auto.onLeave')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.workHours')}</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.workHours}
                  onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.overtimeHrs')}</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.overtimeHours}
                  onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {tAuto('auto.cancel')}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.date || createMutation.isPending}
            >
              {createMutation.isPending
                ? (tAuto('auto.saving'))
                : (tAuto('auto.save'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
