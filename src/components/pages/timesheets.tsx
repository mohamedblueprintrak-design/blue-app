"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Clock } from "lucide-react";
import { getMonday, getWeekDays, formatDate, emptyEntry } from "./timesheets/helpers";
import { TimesheetStats } from "./timesheets/timesheet-stats";
import { TimesheetTable } from "./timesheets/timesheet-table";
import { TimesheetFormDialog, TimesheetViewDialog, TimesheetRejectDialog } from "./timesheets/timesheet-dialogs";
import type { Timesheet, Summary, EmployeeOption, ProjectOption, FormEntry } from "./timesheets/types";

interface TimesheetsProps {
  language: "ar" | "en";
  projectId?: string;
}

export function TimesheetsPage({ language, projectId: _projectId }: TimesheetsProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => getMonday(new Date()));
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectedReason, setRejectedReason] = useState("");

  // Form state for entries grid
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formProjectId, setFormProjectId] = useState<string | null>(null);
  const [formNotes, setFormNotes] = useState("");
  const [formEntries, setFormEntries] = useState<FormEntry[]>([]);

  const weekStart = getMonday(selectedWeek);
  const weekDays = useMemo(() => getWeekDays(getMonday(selectedWeek)), [selectedWeek]);

  const resetForm = () => {
    setFormEmployeeId("");
    setFormProjectId(null);
    setFormNotes("");
    setFormEntries(weekDays.map((d) => emptyEntry(d)));
    setEditingId(null);
  };

  // Fetch timesheets
  const { data, isLoading } = useQuery<{ timesheets: Timesheet[]; summary: Summary }>({
    queryKey: ["timesheets", filterStatus, filterEmployee],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterEmployee !== "all") params.set("employeeId", filterEmployee);
      const res = await fetch(`/api/timesheets?${params}`);
      if (!res.ok) throw new Error("Failed to fetch timesheets");
      return res.json();
    },
  });

  const timesheets = data?.timesheets || [];
  const summary = data?.summary || { thisWeekHours: 0, pending: 0, approved: 0, rejected: 0 };

  // Fetch employees
  const { data: employeesData } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json || [];
    },
  });
  const employees = Array.isArray(employeesData) ? employeesData : [];

  // Fetch projects for dropdowns
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const url = editingId ? `/api/timesheets/${editingId}` : "/api/timesheets";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getMutationHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(err.error, "Failed to save timesheet"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      setShowFormDialog(false);
      resetForm();
      toast[editingId ? "updated" : "created"](ar ? "سجل الدوام" : "Timesheet");
    },
    onError: (err: Error) => {
      toast.error(err.message || (ar ? "حفظ سجل الدوام" : "Save timesheet"));
    },
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, rejectedReason: reason }: { id: string; status: string; rejectedReason?: string }) => {
      const body: Record<string, unknown> = { status };
      if (reason) body.rejectedReason = reason;
      const res = await fetch(`/api/timesheets/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(err.error, "Failed to update status"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.updated(ar ? "حالة سجل الدوام" : "Timesheet status");
    },
    onError: (err: Error) => {
      toast.error(err.message || (ar ? "تحديث الحالة" : "Update status"));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/timesheets/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.deleted(ar ? "سجل الدوام" : "Timesheet");
    },
    onError: () => {
      toast.error(ar ? "حذف سجل الدوام" : "Delete timesheet");
    },
  });

  // Entry update helper
  const updateEntry = (index: number, field: string, value: string | number | null) => {
    setFormEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const totalFormHours = formEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  const handleNewTimesheet = () => {
    resetForm();
    setShowFormDialog(true);
  };

  const handleView = (ts: Timesheet) => {
    setViewingTimesheet(ts);
    setShowViewDialog(true);
  };

  const handleEdit = (ts: Timesheet) => {
    setEditingId(ts.id);
    setFormEmployeeId(ts.employeeId);
    setFormProjectId(ts.projectId);
    setFormNotes(ts.notes || "");
    const mapped = weekDays.map((day) => {
      const existing = ts.entries.find((e) => formatDate(e.date) === formatDate(day));
      return existing
        ? { date: formatDate(day), hours: Number(existing.hours), taskType: existing.taskType, description: existing.description, projectId: existing.projectId }
        : emptyEntry(day);
    });
    setFormEntries(mapped);
    setShowFormDialog(true);
  };

  const handleSubmit = () => {
    if (!formEmployeeId) {
      toast.error(ar ? "اختر الموظف" : "Select an employee");
      return;
    }
    const validEntries = formEntries.filter((e) => e.hours > 0);
    if (validEntries.length === 0) {
      toast.error(ar ? "أضف ساعات عمل واحدة على الأقل" : "Add at least one work hour entry");
      return;
    }

    saveMutation.mutate({
      employeeId: formEmployeeId,
      projectId: formProjectId,
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(new Date(weekStart.getTime() + 6 * 86400000)),
      notes: formNotes,
      entries: validEntries,
    });
  };

  const handleReject = () => {
    if (rejectingId) {
      statusMutation.mutate({ id: rejectingId, status: "REJECTED", rejectedReason });
      setShowRejectDialog(false);
      setRejectingId(null);
      setRejectedReason("");
    }
  };

  const navigateWeek = (direction: number) => {
    setSelectedWeek((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direction * 7);
      return getMonday(d);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Clock className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {ar ? "سجلات الدوام" : "Timesheets"}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {timesheets.length} {ar ? "سجل" : "records"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={ar ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع الحالات" : "All Status"}</SelectItem>
              <SelectItem value="DRAFT">{ar ? "مسودة" : "Draft"}</SelectItem>
              <SelectItem value="SUBMITTED">{ar ? "مقدمة" : "Submitted"}</SelectItem>
              <SelectItem value="APPROVED">{ar ? "معتمدة" : "Approved"}</SelectItem>
              <SelectItem value="REJECTED">{ar ? "مرفوضة" : "Rejected"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg">
              <SelectValue placeholder={ar ? "الموظف" : "Employee"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع الموظفين" : "All Employees"}</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.user?.name || emp.user?.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-sm shadow-violet-600/20"
            onClick={handleNewTimesheet}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {ar ? "سجل جديد" : "New Timesheet"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <TimesheetStats ar={ar} summary={summary} />

      {/* Table */}
      <TimesheetTable
        ar={ar}
        isLoading={isLoading}
        timesheets={timesheets}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onSubmitStatus={(id, status) => statusMutation.mutate({ id, status })}
        onReject={(id) => {
          setRejectingId(id);
          setShowRejectDialog(true);
        }}
      />

      {/* Create / Edit Dialog */}
      <TimesheetFormDialog
        ar={ar}
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        editingId={editingId}
        weekStart={weekStart}
        weekDays={weekDays}
        formEmployeeId={formEmployeeId}
        setFormEmployeeId={setFormEmployeeId}
        formProjectId={formProjectId}
        setFormProjectId={setFormProjectId}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        formEntries={formEntries}
        updateEntry={updateEntry}
        totalFormHours={totalFormHours}
        employees={employees}
        projects={projects}
        saveMutation={saveMutation}
        navigateWeek={navigateWeek}
        handleSubmit={handleSubmit}
        resetForm={resetForm}
      />

      {/* View Dialog */}
      <TimesheetViewDialog
        ar={ar}
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        viewingTimesheet={viewingTimesheet}
      />

      {/* Reject Dialog */}
      <TimesheetRejectDialog
        ar={ar}
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        rejectedReason={rejectedReason}
        setRejectedReason={setRejectedReason}
        onReject={handleReject}
        isPending={statusMutation.isPending}
      />
    </div>
  );
}

export default TimesheetsPage;
