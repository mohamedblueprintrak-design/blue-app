"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  UserPlus,
  Flame,
  Activity,
} from "lucide-react";

// ===== Types =====
interface WorkloadEmployee {
  id: string;
  userId: string;
  name: string;
  EMAIL: string;
  avatar: string;
  department: string;
  position: string;
  employmentStatus: string;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    todo: number;
    review: number;
  };
}

interface WorkloadSummary {
  totalEmployees: number;
  available: number;
  occupied: number;
  overloaded: number;
  avgTasksPerPerson: number;
}

// ===== Helpers =====
function getInitials(name: string) {
  return name.split(" ").map((n) => n.charAt(0)).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300",
    "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
    "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",
    "bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300",
    "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300",
    "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
    "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getAvailability(employee: WorkloadEmployee): "AVAILABLE" | "occupied" | "overloaded" {
  const inProgress = employee.taskStats.inProgress + employee.taskStats.review;
  const overdue = employee.taskStats.overdue;
  if (overdue > 0) return "overloaded";
  if (inProgress >= 5) return "overloaded";
  if (inProgress >= 3) return "occupied";
  return "AVAILABLE";
}

function getAvailabilityConfig(status: "AVAILABLE" | "occupied" | "overloaded", ar: boolean) {
  const configs = {
    AVAILABLE: {
      label: ar ? "متاح" : "Available",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      dot: "bg-green-500",
      border: "border-green-200 dark:border-green-800/50",
    },
    occupied: {
      label: ar ? "مشغول" : "Occupied",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      dot: "bg-amber-500",
      border: "border-amber-200 dark:border-amber-800/50",
    },
    overloaded: {
      label: ar ? "مثقل" : "Overloaded",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      dot: "bg-red-500",
      border: "border-red-200 dark:border-red-800/50",
    },
  };
  return configs[status];
}

// ===== Task Distribution Bar =====
function TaskDistributionBar({ stats, ar }: { stats: WorkloadEmployee["taskStats"]; ar: boolean }) {
  const total = stats.total || 1;
  const segments = [
    { count: stats.completed, color: "bg-green-500", label: ar ? "مكتمل" : "Done" },
    { count: stats.inProgress, color: "bg-amber-500", label: ar ? "قيد التنفيذ" : "In Progress" },
    { count: stats.overdue, color: "bg-red-500", label: ar ? "متأخر" : "Overdue" },
    { count: stats.todo + stats.review, color: "bg-slate-300 dark:bg-slate-600", label: ar ? "أخرى" : "Other" },
  ].filter((s) => s.count > 0);

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`${seg.color} transition-all duration-500`}
            style={{ width: `${(seg.count / total) * 100}%` }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${seg.color}`} />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {seg.label}: <span className="font-medium text-slate-700 dark:text-slate-300">{seg.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Employee Workload Card =====
function EmployeeWorkloadCard({ employee, ar }: { employee: WorkloadEmployee; ar: boolean }) {
  const availability = getAvailability(employee);
  const config = getAvailabilityConfig(availability, ar);

  return (
    <div className={`rounded-xl border p-4 transition-all hover:shadow-md ${config.border} bg-white dark:bg-slate-900`}>
      {/* Header: Avatar + Info */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={employee.avatar} alt={employee.name} />
          <AvatarFallback className={`text-xs font-semibold ${getAvatarColor(employee.name)}`}>
            {getInitials(employee.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {employee.name}
          </h4>
          <p className="text-[11px] text-slate-400 truncate">
            {employee.position}{employee.department ? ` · ${employee.department}` : ""}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          <span className={`text-[10px] font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-3 gap-2 mb-1">
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">
              {employee.taskStats.completed}
            </p>
            <p className="text-[9px] text-green-600/60 dark:text-green-500/60">
              {ar ? "مكتمل" : "Done"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {employee.taskStats.inProgress}
            </p>
            <p className="text-[9px] text-amber-600/60 dark:text-amber-500/60">
              {ar ? "قيد التنفيذ" : "Active"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">
              {employee.taskStats.overdue}
            </p>
            <p className="text-[9px] text-red-600/60 dark:text-red-500/60">
              {ar ? "متأخر" : "Overdue"}
            </p>
          </div>
        </div>
      </div>

      {/* Distribution Bar */}
      <TaskDistributionBar stats={employee.taskStats} ar={ar} />
    </div>
  );
}

// ===== Main Workload Component =====
interface WorkloadPageProps {
  language: "ar" | "en";
}

export default function WorkloadPage({ language }: WorkloadPageProps) {
  const ar = language === "ar";
  const [filterDept, setFilterDept] = useState("all");

  // Fetch employees with task stats
  const { data: workloadData, isLoading } = useQuery<{
    employees: WorkloadEmployee[];
    summary: WorkloadSummary;
    departments: string[];
  }>({
    queryKey: ["workload", filterDept],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterDept !== "all") params.set("department", filterDept);
      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      const employees = await res.json();

      // Fetch all tasks
      const tasksRes = await fetch("/api/tasks");
      const tasksRaw = tasksRes.ok ? await tasksRes.json() : [];
      const tasks = Array.isArray(tasksRaw) ? tasksRaw : (tasksRaw.tasks || []);

      // Build employee workload data
      const departments = [...new Set(employees.map((e: { department: string }) => e.department).filter(Boolean))] as string[];
      
      const enrichedEmployees = employees.map((emp: { id: string; userId: string; user: { name: string; email: string; avatar: string; department: string; position: string }; department: string; position: string; employmentStatus: string }) => {
        const now = new Date();
        const empTasks = tasks.filter((t: { assigneeId: string }) => t.assigneeId === emp.userId);
        const completed = empTasks.filter((t: { status: string }) => t.status === "DONE").length;
        const inProgress = empTasks.filter((t: { status: string }) => t.status === "IN_PROGRESS").length;
        const overdue = empTasks.filter((t: { status: string; dueDate: string | null }) => 
          t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE" && t.status !== "CANCELLED"
        ).length;
        const todo = empTasks.filter((t: { status: string }) => t.status === "TODO").length;
        const review = empTasks.filter((t: { status: string }) => t.status === "REVIEW").length;
        const total = empTasks.length;

        return {
          id: emp.id,
          userId: emp.userId,
          name: emp.user.name,
          EMAIL: emp.user.email,
          avatar: emp.user.avatar,
          department: emp.department || emp.user.department || "",
          position: emp.position || emp.user.position || "",
          employmentStatus: emp.employmentStatus,
          taskStats: { total, completed, inProgress, overdue, todo, review },
        };
      });

      const summary = {
        totalEmployees: enrichedEmployees.length,
        available: enrichedEmployees.filter((e: WorkloadEmployee) => getAvailability(e) === "AVAILABLE").length,
        occupied: enrichedEmployees.filter((e: WorkloadEmployee) => getAvailability(e) === "occupied").length,
        overloaded: enrichedEmployees.filter((e: WorkloadEmployee) => getAvailability(e) === "overloaded").length,
        avgTasksPerPerson: enrichedEmployees.length > 0
          ? Math.round(enrichedEmployees.reduce((sum: number, e: WorkloadEmployee) => sum + e.taskStats.total, 0) / enrichedEmployees.length * 10) / 10
          : 0,
      };

      return { employees: enrichedEmployees, summary, departments };
    },
  });

  const employees = workloadData?.employees || [];
  const summary = workloadData?.summary || { totalEmployees: 0, available: 0, occupied: 0, overloaded: 0, avgTasksPerPerson: 0 };
  const departments = workloadData?.departments || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <Activity className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {ar ? "أعباء العمل" : "Team Workload"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {summary.avgTasksPerPerson} {ar ? "مهمة/شخص" : "tasks/person"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={ar ? "القسم" : "Department"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع الأقسام" : "All Departments"}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي الفريق" : "Team Total"}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{summary.totalEmployees}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-4 border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "متاحون" : "Available"}</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{summary.available}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-4 border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Flame className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "مثقلون" : "Overloaded"}</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{summary.overloaded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Grid with Department Grouping */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          {ar ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
          <Users className="h-10 w-10 mb-3 opacity-50" />
          <p>{ar ? "لا يوجد موظفون" : "No employees found"}</p>
        </div>
      ) : (() => {
        const groupedByDept = employees.reduce<Record<string, WorkloadEmployee[]>>((acc, emp) => {
          const dept = emp.department || (ar ? "أخرى" : "Other");
          if (!acc[dept]) acc[dept] = [];
          acc[dept].push(emp);
          return acc;
        }, {});
        const deptKeys = Object.keys(groupedByDept);
        const showDeptHeaders = deptKeys.length > 1 && filterDept === "all";
        return (
          <div className="space-y-6">
            {deptKeys.map((dept) => (
              <div key={dept}>
                {showDeptHeaders && (
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/50" />
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{dept}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{groupedByDept[dept].length}</Badge>
                    </div>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/50" />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {groupedByDept[dept].map((emp) => (
                    <EmployeeWorkloadCard key={emp.id} employee={emp} ar={ar} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
