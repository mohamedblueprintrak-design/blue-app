"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changeOrderSchema, getErrorMessage, type ChangeOrderFormData } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  FileEdit,
  Filter,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  Wallet,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ===== Types =====
interface ChangeOrderItem {
  id: string;
  projectId: string;
  number: string;
  type: string;
  costImpact: number;
  timeImpact: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }

// ===== Helpers =====
function getTypeConfig(type: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string; gradient: string; icon: typeof TrendingUp }> = {
    ADDITION: { label: "إضافة", labelEn: "Addition", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", gradient: "from-emerald-500 to-emerald-600", icon: TrendingUp },
    CHANGE: { label: "تغيير", labelEn: "Change", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", gradient: "from-amber-500 to-amber-600", icon: Minus },
    DELETION: { label: "حذف", labelEn: "Deletion", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", gradient: "from-red-500 to-red-600", icon: TrendingDown },
  };
  return configs[type] || configs.CHANGE;
}

function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string; gradient: string }> = {
    PENDING: { label: "معلق", labelEn: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", gradient: "from-amber-500 to-amber-600" },
    APPROVED: { label: "معتمد", labelEn: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", gradient: "from-emerald-500 to-emerald-600" },
    REJECTED: { label: "مرفوض", labelEn: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", gradient: "from-red-500 to-red-600" },
  };
  return configs[status] || configs.PENDING;
}

// ===== Helpers =====
interface ChangeOrdersProps { language: "ar" | "en"; projectId?: string; }

export default function ChangeOrders({ language, projectId }: ChangeOrdersProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: changeOrders = [], isLoading } = useQuery<ChangeOrderItem[]>({
    queryKey: ["change-orders", filterProject, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/change-orders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch change orders");
      const json = await res.json(); return json.data || json;
    },
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/change-orders", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create change order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-orders"] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/change-orders/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["change-orders"] }),
  });

  const defaultCOForm = { projectId: projectId || "", number: "", type: "MODIFICATION" as const, costImpact: "0", timeImpact: "", description: "", status: "PENDING" as const };
  const [_formData, setFormData] = useState(defaultCOForm);

  const form = useForm<ChangeOrderFormData>({ resolver: zodResolver(changeOrderSchema) as unknown as Resolver<ChangeOrderFormData>, defaultValues: defaultCOForm });
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, setValue } = form;
  const watchProjectId = useWatch({ control: form.control, name: "projectId" });
  const watchType = useWatch({ control: form.control, name: "type" });
  const watchStatus = useWatch({ control: form.control, name: "status" });

  // Auto-set project filter from props (using state comparison pattern)
  const [prevProjectId, setPrevProjectId] = useState<string | null>(null);
  if (projectId && projectId !== prevProjectId) {
    setPrevProjectId(projectId);
    setFilterProject(projectId);
    setValue("projectId", projectId);
  }

  const resetForm = () => { const f = { ...defaultCOForm, projectId: projectId || (filterProject !== "all" ? filterProject : "") }; setFormData(f); reset(f); };

  // Summary calculations
  const totalCount = changeOrders.length;
  const pendingCount = changeOrders.filter((co) => co.status === "PENDING").length;
  const approvedCount = changeOrders.filter((co) => co.status === "APPROVED").length;
  const totalCost = changeOrders.reduce((sum, co) => sum + (co.costImpact || 0), 0);
  const pendingCost = changeOrders.filter((co) => co.status === "PENDING").reduce((sum, co) => sum + (co.costImpact || 0), 0);
  const approvedCost = changeOrders.filter((co) => co.status === "APPROVED").reduce((sum, co) => sum + (co.costImpact || 0), 0);
  const urgentOrders = changeOrders.filter((co) => co.status === "PENDING" && Math.abs(co.costImpact || 0) > 50000);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <FileEdit className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "أوامر التغيير" : "Change Orders"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {changeOrders.length} {ar ? "أمر تغيير" : "orders"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={ar ? "المشروع" : "Project"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع المشاريع" : "All Projects"}</SelectItem>
              {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          )}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg">
              <SelectValue placeholder={ar ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              <SelectItem value="PENDING">{ar ? "معلق" : "Pending"}</SelectItem>
              <SelectItem value="APPROVED">{ar ? "معتمد" : "Approved"}</SelectItem>
              <SelectItem value="REJECTED">{ar ? "مرفوض" : "Rejected"}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "أمر جديد" : "New Order"}
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileEdit className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي الأوامر" : "Total Orders"}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{totalCount}</p>
                <p className={cn("text-[10px] tabular-nums font-medium", totalCost > 0 ? "text-emerald-600 dark:text-emerald-400" : totalCost < 0 ? "text-red-600 dark:text-red-400" : "text-slate-400")}>
                  {totalCost !== 0 ? formatCurrency(totalCost, ar) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "معلق" : "Pending"}</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{pendingCount}</p>
                <p className="text-[10px] tabular-nums font-medium text-amber-500 dark:text-amber-400">
                  {pendingCost !== 0 ? formatCurrency(pendingCost, ar) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "معتمد" : "Approved"}</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{approvedCount}</p>
                <p className="text-[10px] tabular-nums font-medium text-emerald-500 dark:text-emerald-400">
                  {approvedCost !== 0 ? formatCurrency(approvedCost, ar) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Impact Summary */}
      {changeOrders.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{ar ? "التأثير المالي الإجمالي" : "Total Financial Impact"}</span>
            </div>
            <div className="flex items-center gap-6 sm:ms-auto">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">{ar ? "المعلق" : "Pending"}</p>
                <p className={cn("text-sm font-bold tabular-nums font-mono", pendingCost >= 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                  {formatCurrency(pendingCost, ar)}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">{ar ? "المعتمد" : "Approved"}</p>
                <p className={cn("text-sm font-bold tabular-nums font-mono", approvedCost >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {formatCurrency(approvedCost, ar)}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">{ar ? "الصافي" : "Net"}</p>
                <p className={cn("text-sm font-bold tabular-nums font-mono", totalCost >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400")}>
                  {formatCurrency(totalCost, ar)}
                </p>
              </div>
              {urgentOrders.length > 0 && (
                <>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <Zap className="h-3 w-3" />
                    {urgentOrders.length} {ar ? "عاجل" : "URGENT"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">{ar ? "جارٍ التحميل..." : "Loading..."}</div>
        ) : changeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <FileEdit className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{ar ? "لا توجد أوامر تغيير" : "No change orders"}</h3>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-380px)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold">{ar ? "الرقم" : "Number"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "المشروع" : "Project"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "النوع" : "Type"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "التأثير المالي" : "Cost Impact"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "التأثير الزمني" : "Time Impact"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeOrders.map((co) => {
                  const typeCfg = getTypeConfig(co.type);
                  const stCfg = getStatusConfig(co.status);
                  const TypeIcon = typeCfg.icon;
                  const isUrgent = co.status === "PENDING" && Math.abs(co.costImpact || 0) > 50000;
                  return (
                    <TableRow
                      key={co.id}
                      className={cn(
                        "group even:bg-slate-50/50 dark:even:bg-slate-800/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        isUrgent && "border-s-red-300 border-s-4 dark:border-s-red-700",
                      )}
                    >
                      <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {co.number}
                          {isUrgent && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{co.project ? (ar ? co.project.name : co.project.nameEn || co.project.name) : "-"}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                          typeCfg.color,
                        )}>
                          <TypeIcon className="h-3 w-3" />
                          <span className="ms-0.5">{ar ? typeCfg.label : typeCfg.labelEn}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-sm font-semibold tabular-nums font-mono",
                          co.costImpact > 0 ? "text-emerald-600 dark:text-emerald-400" : co.costImpact < 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400",
                        )}>
                          {co.costImpact !== 0 ? formatCurrency(co.costImpact, ar) : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">{co.timeImpact || "-"}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium",
                          stCfg.color,
                        )}>
                          {ar ? stCfg.label : stCfg.labelEn}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="More options">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={ar ? "start" : "end"} className="w-36">
                            <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => { if (confirm(ar ? "هل أنت متأكد من الحذف؟" : "Delete this change order?")) deleteMutation.mutate(co.id); }}>
                              <Trash2 className="h-3.5 w-3.5 me-2" />{ar ? "حذف" : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ar ? "أمر تغيير جديد" : "New Change Order"}</DialogTitle>
            <DialogDescription>{ar ? "إضافة أمر تغيير جديد" : "Add a new change order"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={rhfHandleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المشروع" : "Project"} *</Label>
                <Select value={watchProjectId} onValueChange={(v) => setValue("projectId", v)}>
                  <SelectTrigger className={cn(errors.projectId && "border-red-500")}><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.projectId && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.projectId.message || "", ar)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الرقم" : "Number"} *</Label>
                <Input {...register("number")} placeholder="CO-001" className={cn(errors.number && "border-red-500")} />
                {errors.number && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.number.message || "", ar)}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "النوع" : "Type"}</Label>
                <Select value={watchType} onValueChange={(v) => setValue("type", v as ChangeOrderFormData["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADDITION">{ar ? "إضافة" : "Addition"}</SelectItem>
                    <SelectItem value="CHANGE">{ar ? "تغيير" : "Change"}</SelectItem>
                    <SelectItem value="DELETION">{ar ? "حذف" : "Deletion"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الحالة" : "Status"}</Label>
                <Select value={watchStatus} onValueChange={(v) => setValue("status", v as ChangeOrderFormData["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">{ar ? "معلق" : "Pending"}</SelectItem>
                    <SelectItem value="APPROVED">{ar ? "معتمد" : "Approved"}</SelectItem>
                    <SelectItem value="REJECTED">{ar ? "مرفوض" : "Rejected"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "التأثير المالي (درهم)" : "Cost Impact (AED)"}</Label>
                <Input type="number" {...register("costImpact")} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "التأثير الزمني" : "Time Impact"}</Label>
                <Input {...register("timeImpact")} placeholder={ar ? "مثال: +7 أيام" : "e.g. +7 days"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "الوصف" : "Description"}</Label>
              <Textarea {...register("description")} placeholder={ar ? "وصف أمر التغيير" : "Change order description"} rows={3} />
            </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={createMutation.isPending}>
              {createMutation.isPending ? (ar ? "جارٍ الإنشاء..." : "Creating...") : (ar ? "إنشاء" : "Create")}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
