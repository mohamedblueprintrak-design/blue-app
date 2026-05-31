"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submittalSchema, getErrorMessage, type SubmittalFormData } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FileText,
  Filter,
  Trash2,
  MoreHorizontal,
  ClipboardCheck,
  Eye,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ===== Types =====
interface SubmittalItem {
  id: string;
  projectId: string;
  number: string;
  title: string;
  type: string;
  contractor: string;
  revisionNumber: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }

// ===== Helpers =====
function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string; gradient: string }> = {
    UNDER_REVIEW: { label: "قيد المراجعة", labelEn: "Under Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", gradient: "from-amber-500 to-amber-600" },
    APPROVED: { label: "معتمد", labelEn: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", gradient: "from-emerald-500 to-emerald-600" },
    REJECTED: { label: "مرفوض", labelEn: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", gradient: "from-red-500 to-red-600" },
    RESUBMIT: { label: "إعادة تقديم", labelEn: "Resubmit", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", gradient: "from-blue-500 to-blue-600" },
  };
  return configs[status] || configs.UNDER_REVIEW;
}

function getRevisionColor(rev: number) {
  if (rev >= 3) return "text-red-600 dark:text-red-400 font-bold";
  if (rev >= 2) return "text-amber-600 dark:text-amber-400 font-semibold";
  return "text-slate-600 dark:text-slate-400 font-mono";
}

// ===== Main Component =====
interface SubmittalsProps { language: "ar" | "en"; projectId?: string; }

export default function Submittals({ language, projectId }: SubmittalsProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: submittals = [], isLoading } = useQuery<SubmittalItem[]>({
    queryKey: ["submittals", filterProject, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/submittals?${params}`);
      if (!res.ok) throw new Error("Failed to fetch submittals");
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/submittals", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create submittal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submittals"] });
      setShowAddDialog(false);
      resetForm();
      toast.created(ar ? "المستند" : "Submittal");
    },
    onError: () => {
      toast.error(ar ? "إنشاء المستند" : "Create submittal");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/submittals/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submittals"] });
      toast.deleted(ar ? "المستند" : "Submittal");
    },
    onError: () => {
      toast.error(ar ? "حذف المستند" : "Delete submittal");
    },
  });

  const defaultSubForm = { projectId: projectId || "", number: "", title: "", type: "", contractor: "", revisionNumber: "1", status: "UNDER_REVIEW" };
  const [_formData, setFormData] = useState(defaultSubForm);

  const form = useForm<SubmittalFormData>({ resolver: zodResolver(submittalSchema) as any, defaultValues: defaultSubForm }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, setValue, watch } = form;

  // Auto-set project filter from props
  useEffect(() => {
    if (projectId) {
      setFilterProject(projectId);
      setValue("projectId", projectId);
    }
  }, [projectId, setValue]);

  const resetForm = () => { const f = { ...defaultSubForm, projectId: projectId || (filterProject !== "all" ? filterProject : "") }; setFormData(f); reset(f); };

  // Summary calculations
  const totalSubmittals = submittals.length;
  const underReviewCount = submittals.filter((s) => s.status === "UNDER_REVIEW").length;
  const approvedCount = submittals.filter((s) => s.status === "APPROVED").length;
  const rejectedCount = submittals.filter((s) => s.status === "REJECTED").length;
  const resubmitCount = submittals.filter((s) => s.status === "RESUBMIT").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <FileText className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "المستندات المقدمة" : "Submittals"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {submittals.length} {ar ? "مستند" : "submittals"}
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
            <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
              <SelectValue placeholder={ar ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              <SelectItem value="UNDER_REVIEW">{ar ? "قيد المراجعة" : "Under Review"}</SelectItem>
              <SelectItem value="APPROVED">{ar ? "معتمد" : "Approved"}</SelectItem>
              <SelectItem value="REJECTED">{ar ? "مرفوض" : "Rejected"}</SelectItem>
              <SelectItem value="RESUBMIT">{ar ? "إعادة تقديم" : "Resubmit"}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "تقديم جديد" : "New Submittal"}
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي المقدم" : "Total Submittals"}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{totalSubmittals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "قيد المراجعة" : "Under Review"}</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{underReviewCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "معتمد" : "Approved"}</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "مرفوض" : "Rejected"}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution Mini Bar */}
      {totalSubmittals > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {ar ? "توزيع الحالة" : "Status Distribution"}
            </span>
            {resubmitCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                <RotateCcw className="h-3 w-3" />
                {resubmitCount} {ar ? "إعادة تقديم" : "RESUBMIT"}
              </span>
            )}
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            {underReviewCount > 0 && (
              <div className="bg-amber-400 dark:bg-amber-500 transition-all" style={{ width: `${(underReviewCount / totalSubmittals) * 100}%` }} />
            )}
            {approvedCount > 0 && (
              <div className="bg-emerald-500 dark:bg-emerald-600 transition-all" style={{ width: `${(approvedCount / totalSubmittals) * 100}%` }} />
            )}
            {rejectedCount > 0 && (
              <div className="bg-red-500 dark:bg-red-600 transition-all" style={{ width: `${(rejectedCount / totalSubmittals) * 100}%` }} />
            )}
            {resubmitCount > 0 && (
              <div className="bg-blue-500 dark:bg-blue-600 transition-all" style={{ width: `${(resubmitCount / totalSubmittals) * 100}%` }} />
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">{ar ? "جارٍ التحميل..." : "Loading..."}</div>
        ) : submittals.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{ar ? "لا توجد مستندات" : "No submittals"}</h3>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-380px)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold">{ar ? "الرقم" : "Number"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "المشروع" : "Project"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "العنوان" : "Title"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "النوع" : "Type"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "المقاول" : "Contractor"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "المراجعة" : "Rev #"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittals.map((sub, _idx) => {
                  const stCfg = getStatusConfig(sub.status);
                  const isPendingReview = sub.status === "UNDER_REVIEW";
                  return (
                    <TableRow
                      key={sub.id}
                      className={cn(
                        "group even:bg-slate-50/50 dark:even:bg-slate-800/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        isPendingReview && "border-s-amber-300 border-s-4 dark:border-s-amber-700",
                      )}
                    >
                      <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">{sub.number || "-"}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{sub.project ? (ar ? sub.project.name : sub.project.nameEn || sub.project.name) : "-"}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-white max-w-[200px] truncate">{sub.title}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">{sub.type || "-"}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{sub.contractor || "-"}</TableCell>
                      <TableCell className="text-xs text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center min-w-[24px] h-6 rounded-md px-1.5",
                          getRevisionColor(sub.revisionNumber),
                          sub.revisionNumber >= 2 && "bg-amber-50 dark:bg-amber-950/30",
                          sub.revisionNumber >= 3 && "bg-red-50 dark:bg-red-950/30",
                        )}>
                          {sub.revisionNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
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
                            <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => { if (confirm(ar ? "هل أنت متأكد من الحذف؟" : "Delete this submittal?")) deleteMutation.mutate(sub.id); }}>
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
            <DialogTitle>{ar ? "تقديم مستند جديد" : "New Submittal"}</DialogTitle>
            <DialogDescription>{ar ? "إضافة مستند مقدم جديد" : "Add a new submittal"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={rhfHandleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المشروع" : "Project"} *</Label>
                {/* eslint-disable-next-line react-hooks/incompatible-library */}
                <Select value={watch("projectId")} onValueChange={(v) => setValue("projectId", v)}>
                  <SelectTrigger className={cn(errors.projectId && "border-red-500")}><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.projectId && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.projectId.message || "", ar)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الرقم" : "Number"}</Label>
                <Input {...register("number")} placeholder="SUB-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "العنوان" : "Title"} *</Label>
              <Input {...register("title")} placeholder={ar ? "عنوان المستند" : "Submittal title"} className={cn(errors.title && "border-red-500")} />
              {errors.title && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.title.message || "", ar)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "النوع" : "Type"}</Label>
                <Input {...register("type")} placeholder={ar ? "مخططات، مواصفات..." : "Drawings, specs..."} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المقاول" : "Contractor"}</Label>
                <Input {...register("contractor")} placeholder={ar ? "اسم المقاول" : "Contractor name"} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "رقم المراجعة" : "Revision #"}</Label>
                <Input type="number" min={1} {...register("revisionNumber")} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الحالة" : "Status"}</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNDER_REVIEW">{ar ? "قيد المراجعة" : "Under Review"}</SelectItem>
                    <SelectItem value="APPROVED">{ar ? "معتمد" : "Approved"}</SelectItem>
                    <SelectItem value="REJECTED">{ar ? "مرفوض" : "Rejected"}</SelectItem>
                    <SelectItem value="RESUBMIT">{ar ? "إعادة تقديم" : "Resubmit"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
