"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import type { EmployeeFormData } from "@/lib/validations";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/ui/status-icon";
import { Card, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Pencil,
  Mail,
  Phone,
  Building2,
  Briefcase,
  DollarSign,
  Calendar,
  X,
  Users,
  LayoutGrid,
  LayoutList,
} from "lucide-react";

import { EmployeeStats } from "./employees/employee-stats";
import { EmployeeTable } from "./employees/employee-table";
import { EmployeeFormDialog } from "./employees/employee-form-dialog";
import type { Employee, UserOption } from "./employees/types";
import { getStatusConfig, getInitials, getAvatarColor, departmentColors, skillTags } from "./employees/utils";

// ===== Main Employees Component =====
interface EmployeesPageProps {
  language: "ar" | "en";
}

export default function EmployeesPage({ language }: EmployeesPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees", filterDept],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterDept !== "all") params.set("department", filterDept);
      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      const json = await res.json();
      return json.data || json.employees || json;
    },
  });

  // Fetch users for dropdown
  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch("/api/users-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get unique departments
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create employee");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowAddDialog(false);
      toast.created(tAuto('auto.employee'));
    },
    onError: () => {
      toast.error(tAuto('auto.createEmployee'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update employee");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEditEmployee(null);
      toast.updated(tAuto('auto.employee'));
    },
    onError: () => {
      toast.error(tAuto('auto.updateEmployee'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/employees/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setSelectedEmployee(null);
      toast.deleted(tAuto('auto.employee'));
    },
    onError: () => {
      toast.error(tAuto('auto.deleteEmployee'));
    },
  });

  const openEditDialog = (emp: Employee) => {
    setEditEmployee(emp);
  };

  const openAddDialog = () => {
    setShowAddDialog(true);
  };

  const handleSave = (data: EmployeeFormData) => {
    if (editEmployee) {
      updateMutation.mutate({ id: editEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter
  const filteredEmployees = employees.filter((e) => {
    const matchSearch =
      e.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      e.user?.email.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  // Generate demo skills for display
  const getDemoSkills = (position: string) => {
    const skills: string[] = [];
    if (position.toLowerCase().includes("engineer") || position.includes("مهندس")) skills.push("AutoCAD", "Revit");
    if (position.toLowerCase().includes("MANAGER") || position.includes("مدير")) skills.push("Project Management", "Excel");
    if (position.toLowerCase().includes("planner") || position.includes("مخطط")) skills.push("Primavera");
    if (skills.length === 0 && position) skills.push(position.split(" ")[0]);
    return skills.slice(0, 3);
  };

  return (
    <div className="space-y-4">
      {/* Summary Stat Cards */}
      <EmployeeStats employees={employees} ar={ar} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {tAuto('auto.employees')}
          </h2>
          <Badge variant="secondary" className="text-xs">{employees.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tAuto('auto.searchEmployees')}
              className="ps-9 h-8 text-sm"
            />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder={tAuto('auto.department')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.allDepartments')}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none ${viewMode === "table" ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              onClick={() => setViewMode("table")}
              aria-label={tAuto('auto.tableView')}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none ${viewMode === "grid" ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-label={tAuto('auto.gridView')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={openAddDialog}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {tAuto('auto.newEmployee')}
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const statusCfg = getStatusConfig(emp.employmentStatus);
            const skills = getDemoSkills(emp.position);
            const deptColor = departmentColors[emp.department] || "bg-slate-400";
            return (
              <Card
                key={emp.id}
                className={`border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer ${selectedEmployee?.id === emp.id ? "ring-2 ring-teal-500/50" : ""}`}
                onClick={() => setSelectedEmployee(emp)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={emp.user.avatar} alt={emp.user.name} />
                      <AvatarFallback className={`text-sm font-bold ${getAvatarColor(emp.user.name)}`}>
                        {getInitials(emp.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {emp.user.name}
                        </h4>
                        <StatusIcon status={emp.employmentStatus} className="h-3 w-3 shrink-0" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {emp.position || "—"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${deptColor}`} />
                        <span className="text-[10px] text-slate-400 truncate">{emp.department}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 shrink-0 flex items-center gap-1 ${statusCfg.color}`}>
                      <StatusIcon status={emp.employmentStatus} className="h-3 w-3" />
                      {ar ? statusCfg.ar : statusCfg.en}
                    </Badge>
                  </div>

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${skillTags[skill]?.color || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400">
                      {emp.hireDate
                        ? new Date(emp.hireDate).toLocaleDateString(ar ? "ar-AE" : "en-US")
                        : "—"}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatCurrency(emp.salary, ar)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredEmployees.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {tAuto('auto.noEmployeesFound')}
            </div>
          )}
        </div>
      )}

      <div className={`flex gap-4 ${viewMode === "grid" ? "hidden" : ""}`}>
        {/* Table View */}
        <EmployeeTable
          employees={filteredEmployees}
          ar={ar}
          isLoading={isLoading}
          selectedEmployee={selectedEmployee}
          onSelectEmployee={setSelectedEmployee}
          onEditEmployee={openEditDialog}
          onDeleteEmployee={(id, name) => {
            if (confirm(ar ? `حذف "${name}"؟` : `Delete "${name}"?`)) {
              deleteMutation.mutate(id);
            }
          }}
        />

        {/* Profile Card */}
        {selectedEmployee && (
          <EmployeeProfileCard
            employee={selectedEmployee}
            ar={ar}
            onClose={() => setSelectedEmployee(null)}
            onEdit={() => openEditDialog(selectedEmployee)}
          />
        )}
      </div>

      {/* Add/Edit Dialog */}
      <EmployeeFormDialog
        open={showAddDialog || !!editEmployee}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditEmployee(null); }
        }}
        employee={editEmployee}
        users={users}
        ar={ar}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

// ===== Employee Profile Card =====
function EmployeeProfileCard({ employee, ar, onClose, onEdit }: {
  employee: Employee;
  ar: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const tAuto = useTranslations();
  const statusCfg = getStatusConfig(employee.employmentStatus);
  const deptColor = departmentColors[employee.department] || "bg-slate-400";

  return (
    <div className="w-full lg:w-[380px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Gradient Header */}
      <div className="h-20 bg-gradient-to-br from-teal-500 to-teal-700 relative">
        <div className="absolute -bottom-8 start-4">
          <Avatar className="h-16 w-16 border-4 border-white dark:border-slate-900">
            <AvatarImage src={employee.user.avatar} alt={employee.user.name} />
            <AvatarFallback className={`text-lg font-bold ${getAvatarColor(employee.user.name)}`}>
              {getInitials(employee.user.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="p-4 pt-12 space-y-4">
        {/* Name & Status */}
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">{employee.user.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${deptColor}`} />
              <p className="text-xs text-slate-500">{employee.department || "—"}</p>
              <span className="text-slate-300">·</span>
              <p className="text-xs text-slate-500">{employee.position || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onClose} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Badge variant="secondary" className={`text-[10px] h-5 flex items-center gap-1 ${statusCfg.color}`}>
          <StatusIcon status={employee.employmentStatus} className="h-3 w-3" />
          {ar ? statusCfg.ar : statusCfg.en}
        </Badge>

        <Separator />

        {/* Contact Info */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{employee.user.email || "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{employee.user.phone || "—"}</span>
          </div>
        </div>

        <Separator />

        {/* Work Details */}
        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {tAuto('auto.workDetails')}
          </h5>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Building2 className="h-3 w-3" />
                {tAuto('auto.dept')}
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                {employee.department || "—"}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Briefcase className="h-3 w-3" />
                {tAuto('auto.role')}
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                {employee.position || "—"}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <DollarSign className="h-3 w-3" />
                {tAuto('auto.salary')}
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {formatCurrency(employee.salary, ar)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Calendar className="h-3 w-3" />
                {tAuto('auto.hireDate')}
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {employee.hireDate
                  ? new Date(employee.hireDate).toLocaleDateString(ar ? "ar-AE" : "en-US")
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
