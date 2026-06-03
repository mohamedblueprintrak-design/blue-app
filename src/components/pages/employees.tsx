"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, getErrorMessage, type EmployeeFormData } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/ui/status-icon";
import { Card, CardContent } from '@/components/ui/card'
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Search,
  Eye,
  Pencil,
  Trash2,
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
  UserCheck,
  Clock,
  UserPlus,
} from "lucide-react";

// ===== Types =====
interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  isActive: boolean;
  department?: string;
  position?: string;
}

interface Employee {
  id: string;
  userId: string;
  department: string;
  position: string;
  salary: number;
  employmentStatus: string;
  hireDate: string | null;
  createdAt: string;
  user: EmployeeUser;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

// ===== Helpers =====
function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    ACTIVE: { ar: "نشط", en: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
    ON_LEAVE: { ar: "إجازة", en: "On Leave", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    TERMINATED: { ar: "منتهي", en: "Terminated", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  };
  return configs[status] || configs.ACTIVE;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300",
  "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",
  "bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300",
  "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300",
  "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300",
  "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const departmentColors: Record<string, string> = {
  "الهندسة المعمارية": "bg-violet-500",
  "الهندسة الإنشائية": "bg-blue-500",
  "الهندسة الكهربائية": "bg-amber-500",
  "الهندسة الميكانيكية": "bg-teal-500",
  "الإدارة": "bg-slate-500",
  "المالية": "bg-green-500",
  "الموارد البشرية": "bg-rose-500",
  "Architecture": "bg-violet-500",
  "Structural": "bg-blue-500",
  "Electrical": "bg-amber-500",
  "Mechanical": "bg-teal-500",
  "Management": "bg-slate-500",
  "Finance": "bg-green-500",
  "HR": "bg-rose-500",
};

const skillTags: Record<string, { color: string }> = {
  "AutoCAD": { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  "Revit": { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  "Primavera": { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  "Excel": { color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  "Project Management": { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
};

// ===== Main Employees Component =====
interface EmployeesPageProps {
  language: "ar" | "en";
}

export default function EmployeesPage({ language }: EmployeesPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const emptyForm = {
    userId: "",
    department: "",
    position: "",
    salary: "0",
    employmentStatus: "ACTIVE",
    hireDate: "",
  };
  const [_formData, setFormData] = useState(emptyForm);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as unknown as Resolver<EmployeeFormData>,
    defaultValues: emptyForm,
  });
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, setValue, watch } = form;

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees", filterDept],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterDept !== "all") params.set("department", filterDept);
      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      const json = await res.json();
      return json.employees || json;
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

  // Computed stats
  const stats = useMemo(() => ({
    total: employees.length,
    ACTIVE: employees.filter(e => e.employmentStatus === "ACTIVE").length,
    onLeave: employees.filter(e => e.employmentStatus === "ON_LEAVE").length,
    newThisMonth: employees.filter(e => {
      if (!e.hireDate) return false;
      const d = new Date(e.hireDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  }), [employees]);

  const statCards = [
    {
      label: ar ? "إجمالي الموظفين" : "Total Employees",
      value: stats.total,
      icon: Users,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      label: ar ? "نشط" : "Active",
      value: stats.ACTIVE,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: ar ? "في إجازة" : "On Leave",
      value: stats.onLeave,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: ar ? "جديد هذا الشهر" : "New This Month",
      value: stats.newThisMonth,
      icon: UserPlus,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
  ];

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
      setFormData(emptyForm);
      toast.created(ar ? "الموظف" : "Employee");
    },
    onError: () => {
      toast.error(ar ? "إنشاء الموظف" : "Create employee");
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
      setFormData(emptyForm);
      toast.updated(ar ? "الموظف" : "Employee");
    },
    onError: () => {
      toast.error(ar ? "تحديث الموظف" : "Update employee");
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
      toast.deleted(ar ? "الموظف" : "Employee");
    },
    onError: () => {
      toast.error(ar ? "حذف الموظف" : "Delete employee");
    },
  });

  const openEditDialog = (emp: Employee) => {
    setEditEmployee(emp);
    const values = {
      userId: emp.userId,
      department: emp.department,
      position: emp.position,
      salary: String(emp.salary),
      employmentStatus: emp.employmentStatus,
      hireDate: emp.hireDate ? emp.hireDate.split("T")[0] : "",
    };
    setFormData(values);
    reset(values);
  };

  const openAddDialog = () => {
    setFormData(emptyForm);
    reset(emptyForm);
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} className="border-slate-200 dark:border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {ar ? "الموظفون" : "Employees"}
          </h2>
          <Badge variant="secondary" className="text-xs">{employees.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث عن موظف..." : "Search employees..."}
              className="ps-9 h-8 text-sm"
            />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder={ar ? "القسم" : "Department"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع الأقسام" : "All Departments"}</SelectItem>
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
              aria-label="Table view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none ${viewMode === "grid" ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
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
            {ar ? "موظف جديد" : "New Employee"}
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
              {ar ? "لا يوجد موظفون" : "No employees found"}
            </div>
          )}
        </div>
      )}

      <div className={`flex gap-4 ${viewMode === "grid" ? "hidden" : ""}`}>
        {/* Table View */}
        <div className={`flex-1 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden ${selectedEmployee ? "hidden lg:block" : ""}`}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{ar ? "الاسم" : "Name"}</TableHead>
                <TableHead className="hidden md:table-cell">{ar ? "البريد" : "Email"}</TableHead>
                <TableHead className="hidden lg:table-cell">{ar ? "القسم" : "Department"}</TableHead>
                <TableHead className="hidden sm:table-cell">{ar ? "المنصب" : "Position"}</TableHead>
                <TableHead className="hidden md:table-cell">{ar ? "الراتب" : "Salary"}</TableHead>
                <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                <TableHead className="hidden lg:table-cell">{ar ? "تاريخ التعيين" : "Hire Date"}</TableHead>
                <TableHead className="text-start">{ar ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => {
                const statusCfg = getStatusConfig(emp.employmentStatus);
                const deptColor = departmentColors[emp.department] || "bg-slate-400";
                return (
                  <TableRow
                    key={emp.id}
                    className={`group even:bg-slate-50/50 dark:even:bg-slate-800/20 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedEmployee?.id === emp.id ? "bg-teal-50/50 dark:bg-teal-950/20" : ""}`}
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.user.avatar} alt={emp.user.name} />
                          <AvatarFallback className={`text-xs font-semibold ${getAvatarColor(emp.user.name)}`}>
                            {getInitials(emp.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900 dark:text-white text-sm">
                          {emp.user.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-500">
                      {emp.user.email || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${deptColor}`} />
                        {emp.department || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300">
                      {emp.position || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatCurrency(emp.salary, ar)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={emp.employmentStatus} className="h-3 w-3" />
                        <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 flex items-center gap-1 ${statusCfg.color}`}>
                          {ar ? statusCfg.ar : statusCfg.en}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                      {emp.hireDate
                        ? new Date(emp.hireDate).toLocaleDateString(ar ? "ar-AE" : "en-US")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-start" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedEmployee(emp)}
                          aria-label="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(emp)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => {
                            if (confirm(ar ? `حذف "${emp.user.name}"؟` : `Delete "${emp.user.name}"?`)) {
                              deleteMutation.mutate(emp.id);
                            }
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredEmployees.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {ar ? "لا يوجد موظفون" : "No employees found"}
                  </TableCell>
                </TableRow>
              )}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    {ar ? "جارٍ التحميل..." : "Loading..."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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
      <Dialog
        open={showAddDialog || !!editEmployee}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditEmployee(null); setFormData(emptyForm); }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editEmployee ? (ar ? "تعديل موظف" : "Edit Employee") : (ar ? "موظف جديد" : "New Employee")}
            </DialogTitle>
            <DialogDescription>
              {editEmployee
                ? (ar ? "تعديل بيانات الموظف" : "Edit employee information")
                : (ar ? "إضافة موظف جديد" : "Add a new employee")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={rhfHandleSubmit(handleSave as (data: unknown) => void)} className="space-y-4">
            {/* User Select - only for create */}
            {!editEmployee && (
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المستخدم" : "User"} *</Label>
                <Select
                  // eslint-disable-next-line react-hooks/incompatible-library
                  value={watch("userId")}
                  onValueChange={(v) => setValue("userId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ar ? "اختر مستخدم" : "Select user"} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "القسم" : "Department"} *</Label>
                <Input
                  {...register("department")}
                  placeholder={ar ? "مثال: الهندسة المعمارية" : "e.g., Architecture"}
                  className={cn(errors.department && "border-red-500")}
                />
                {errors.department && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.department.message || "", ar)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المنصب" : "Position"} *</Label>
                <Input
                  {...register("position")}
                  placeholder={ar ? "مثال: مهندس أول" : "e.g., Senior Engineer"}
                  className={cn(errors.position && "border-red-500")}
                />
                {errors.position && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.position.message || "", ar)}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الراتب" : "Salary"} ({ar ? "د.إ" : "AED"})</Label>
                <Input
                  type="number"
                  {...register("salary")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "حالة التوظيف" : "Employment Status"}</Label>
                <Select
                  value={watch("employmentStatus")}
                  onValueChange={(v) => setValue("employmentStatus", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{ar ? "نشط" : "Active"}</SelectItem>
                    <SelectItem value="ON_LEAVE">{ar ? "إجازة" : "On Leave"}</SelectItem>
                    <SelectItem value="TERMINATED">{ar ? "منتهي" : "Terminated"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{ar ? "تاريخ التعيين" : "Hire Date"}</Label>
              <Input
                type="date"
                {...register("hireDate")}
              />
            </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowAddDialog(false); setEditEmployee(null); setFormData(emptyForm); reset(); }}
            >
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? (ar ? "جارٍ الحفظ..." : "Saving...")
                : (ar ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
            {ar ? "تفاصيل العمل" : "Work Details"}
          </h5>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Building2 className="h-3 w-3" />
                {ar ? "القسم" : "Dept."}
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                {employee.department || "—"}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Briefcase className="h-3 w-3" />
                {ar ? "المنصب" : "Role"}
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                {employee.position || "—"}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <DollarSign className="h-3 w-3" />
                {ar ? "الراتب" : "Salary"}
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {formatCurrency(employee.salary, ar)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Calendar className="h-3 w-3" />
                {ar ? "تاريخ التعيين" : "Hire Date"}
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
