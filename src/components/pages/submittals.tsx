"use client";


import { useTranslations } from 'next-intl';
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
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
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }

// ===== Helpers =====
function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string; gradient: string }> = {
    UNDER_REVIEW: { label: "قيد المراجعة", labelEn: "Under Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", gradient: "from-amber-500 to-amber-600" },
    APPROVED: { label: "معتمد (A)", labelEn: "Approved (Code A)", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", gradient: "from-emerald-500 to-emerald-600" },
    APPROVED_AS_NOTED: { label: "معتمد مع الملاحظات (B)", labelEn: "Approved as Noted (Code B)", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300", gradient: "from-teal-500 to-teal-600" },
    REVISE_RESUBMIT: { label: "تعديل وإعادة تقديم (C)", labelEn: "Revise & Resubmit (Code C)", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", gradient: "from-orange-500 to-orange-600" },
    REJECTED: { label: "مرفوض (D)", labelEn: "Rejected (Code D)", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", gradient: "from-red-500 to-red-600" },
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
  const tAuto = useTranslations();
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
      toast.created(tAuto('auto.submittal'));
    },
    onError: () => {
      toast.error(tAuto('auto.createSubmittal'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/submittals/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submittals"] });
      toast.deleted(tAuto('auto.submittal'));
    },
    onError: () => {
      toast.error(tAuto('auto.deleteSubmittal'));
    },
  });

  const defaultSubForm = { projectId: projectId || "", number: "", title: "", type: "", contractor: "", revisionNumber: "1", status: "UNDER_REVIEW" as const };
  const [_formData, setFormData] = useState(defaultSubForm);

  const form = useForm<SubmittalFormData>({ resolver: zodResolver(submittalSchema) as Resolver<SubmittalFormData>, defaultValues: defaultSubForm });
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
          <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
            <FileText className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.submittals')}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {submittals.length} {tAuto('auto.submittals1')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={tAuto('auto.project')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.allProjects')}</SelectItem>
              {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          )}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
              <SelectValue placeholder={tAuto('auto.status1')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
              <SelectItem value="UNDER_REVIEW">{tAuto('auto.underReview')}</SelectItem>
              <SelectItem value="APPROVED">{tAuto('auto.approved')}</SelectItem>
              <SelectItem value="REJECTED">{tAuto('auto.rejected')}</SelectItem>
              <SelectItem value="RESUBMIT">{tAuto('auto.resubmit')}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newSubmittal')}
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.totalSubmittals')}</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.underReview')}</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.approved')}</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.rejected')}</p>
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
              {tAuto('auto.statusDistribution')}
            </span>
            {resubmitCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                <RotateCcw className="h-3 w-3" />
                {resubmitCount} {tAuto('auto.rESUBMIT')}
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
          <div className="p-8 text-center text-slate-400">{tAuto('auto.loading')}</div>
        ) : submittals.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.noSubmittals')}</h3>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-380px)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold">{tAuto('auto.number')}</TableHead>
                  <TableHead className="text-xs font-semibold">{tAuto('auto.project')}</TableHead>
                  <TableHead className="text-xs font-semibold">{tAuto('auto.title')}</TableHead>
                  <TableHead className="text-xs font-semibold">{tAuto('auto.type')}</TableHead>
                  <TableHead className="text-xs font-semibold">{tAuto('auto.contractor')}</TableHead>
                  <TableHead className="text-xs font-semibold">{tAuto('auto.rev1')}</TableHead>
                  <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
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
                            <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => { if (confirm(tAuto('auto.deleteThisSubmittal'))) deleteMutation.mutate(sub.id); }}>
                              <Trash2 className="h-3.5 w-3.5 me-2" />{tAuto('auto.delete')}
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
            <DialogTitle>{tAuto('auto.newSubmittal')}</DialogTitle>
            <DialogDescription>{tAuto('auto.addANewSubmittal')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={rhfHandleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.project')} *</Label>
                {/* eslint-disable-next-line react-hooks/incompatible-library */}
                <Select value={watch("projectId")} onValueChange={(v) => setValue("projectId", v)}>
                  <SelectTrigger className={cn(errors.projectId && "border-red-500")}><SelectValue placeholder={tAuto('auto.selectProject')} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.projectId && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.projectId.message || "", ar)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.number')}</Label>
                <Input {...register("number")} placeholder="SUB-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.title')} *</Label>
              <Input {...register("title")} placeholder={tAuto('auto.submittalTitle')} className={cn(errors.title && "border-red-500")} />
              {errors.title && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.title.message || "", ar)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.type')}</Label>
                <Input {...register("type")} placeholder={tAuto('auto.drawingsSpecs')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.contractor')}</Label>
                <Input {...register("contractor")} placeholder={tAuto('auto.contractorName1')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.revision')}</Label>
                <Input type="number" min={1} {...register("revisionNumber")} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.status1')}</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as SubmittalFormData["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNDER_REVIEW">{tAuto('auto.underReview')}</SelectItem>
                    <SelectItem value="APPROVED">{tAuto('auto.approved')}</SelectItem>
                    <SelectItem value="REJECTED">{tAuto('auto.rejected')}</SelectItem>
                    <SelectItem value="RESUBMIT">{tAuto('auto.resubmit')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>{tAuto('auto.cancel')}</Button>
            <Button type="submit" className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white" disabled={createMutation.isPending}>
              {createMutation.isPending ? (tAuto('auto.creating')) : (tAuto('auto.create'))}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
