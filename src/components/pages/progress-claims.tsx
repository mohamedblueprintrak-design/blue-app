"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
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
  Search,
  Inbox,
  FileText,
  ClipboardCheck,
  Pencil,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ===== Types =====
interface ProgressClaimItem {
  id: string;
  organizationId: string | null;
  projectId: string;
  claimNumber: string;
  period: string;
  claimDate: string | null;
  totalClaimAmount: number;
  approvedAmount: number;
  previousCertified: number;
  currentCertified: number;
  retentionAmount: number;
  netPayment: number;
  status: string;
  certifiedDate: string | null;
  certifiedById: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; nameEn: string; number: string };
}

interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

// ===== Helpers =====
function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    DRAFT: {
      ar: "مسودة", en: "Draft",
      color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    SUBMITTED: {
      ar: "مقدم", en: "Submitted",
      color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    },
    UNDER_REVIEW: {
      ar: "قيد المراجعة", en: "Under Review",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    },
    APPROVED: {
      ar: "معتمد", en: "Approved",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    REJECTED: {
      ar: "مرفوض", en: "Rejected",
      color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    },
  };
  return configs[status] || configs.DRAFT;
}

const STATUS_WORKFLOW: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["DRAFT"],
};

// ===== Main Component =====
interface ProgressClaimsPageProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function ProgressClaimsPage({ language, projectId }: ProgressClaimsPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<ProgressClaimItem | null>(null);

  const emptyForm = {
    projectId: projectId || "",
    claimNumber: "",
    period: "",
    claimDate: "",
    totalClaimAmount: "0",
    previousCertified: "0",
    currentCertified: "0",
    retentionAmount: "0",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Auto-calculate netPayment
  const currentCert = parseFloat(formData.currentCertified) || 0;
  const retention = parseFloat(formData.retentionAmount) || 0;
  const netPayment = currentCert - retention;

  // Fetch progress claims
  const { data: claims = [], isLoading } = useQuery<ProgressClaimItem[]>({
    queryKey: ["progress-claims", filterProject],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject && filterProject !== "all") params.set("projectId", filterProject);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/progress-claims?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/progress-claims", {
        method: "POST", headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-claims"] });
      setShowDialog(false);
      setFormData(emptyForm);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/progress-claims/${id}`, {
        method: "PUT", headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-claims"] });
      setEditItem(null);
      setFormData(emptyForm);
      setShowDialog(false);
    },
  });

  // Delete mutation
  const _deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/progress-claims/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-claims"] });
    },
  });

  const filtered = claims.filter((c) => {
    const matchSearch = c.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.period.toLowerCase().includes(search.toLowerCase()) ||
      (ar ? c.project.name : c.project.nameEn || c.project.name).toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Summary
  const totalClaims = filtered.reduce((s, c) => s + Number(c.totalClaimAmount), 0);
  const approvedAmount = filtered.filter((c) => c.status === "APPROVED").reduce((s, c) => s + Number(c.approvedAmount), 0);
  const pendingCount = filtered.filter((c) => ["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(c.status)).length;
  const totalRetained = filtered.reduce((s, c) => s + Number(c.retentionAmount), 0);

  const openEditDialog = (item: ProgressClaimItem) => {
    setEditItem(item);
    setFormData({
      projectId: item.projectId,
      claimNumber: item.claimNumber,
      period: item.period,
      claimDate: item.claimDate ? item.claimDate.split("T")[0] : "",
      totalClaimAmount: String(item.totalClaimAmount),
      previousCertified: String(item.previousCertified),
      currentCertified: String(item.currentCertified),
      retentionAmount: String(item.retentionAmount),
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="py-0 gap-0"><div className="p-4"><Skeleton className="h-20 w-full" /></div></Card>
          ))}
        </div>
        <Card><div className="p-4"><Skeleton className="h-64 w-full" /></div></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <ClipboardCheck className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "مطالبات التقدم" : "Progress Claims"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {ar ? "تطبيقات الدفع المؤقتة الشهرية" : "Monthly interim payment applications"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={() => { setFormData(emptyForm); setEditItem(null); setShowDialog(true); }}>
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "مطالبة جديدة" : "New Claim"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20"><FileText className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /></div>
              <span className="text-xs text-teal-600 dark:text-teal-400">{ar ? "إجمالي المطالبات" : "Total Claims"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{formatCurrency(totalClaims, ar)}</div>
            <p className="text-[10px] text-teal-500/60 mt-1">{filtered.length} {ar ? "مطالبة" : "claims"}</p>
          </div>
        </Card>
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /></div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{ar ? "المعتمد" : "Approved"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{formatCurrency(approvedAmount, ar)}</div>
          </div>
        </Card>
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20"><ClipboardCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /></div>
              <span className="text-xs text-amber-600 dark:text-amber-400">{ar ? "قيد المعالجة" : "Pending"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{pendingCount}</div>
          </div>
        </Card>
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20"><XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" /></div>
              <span className="text-xs text-rose-600 dark:text-rose-400">{ar ? "الاحتجاز" : "Retained"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{formatCurrency(totalRetained, ar)}</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "بحث..." : "Search..."} className="ps-9 h-8 text-sm rounded-lg" />
        </div>
        {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg"><SelectValue placeholder={ar ? "المشروع" : "Project"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع المشاريع" : "All Projects"}</SelectItem>
              {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg"><SelectValue placeholder={ar ? "الحالة" : "Status"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
            <SelectItem value="DRAFT">{ar ? "مسودة" : "Draft"}</SelectItem>
            <SelectItem value="SUBMITTED">{ar ? "مقدم" : "Submitted"}</SelectItem>
            <SelectItem value="UNDER_REVIEW">{ar ? "قيد المراجعة" : "Under Review"}</SelectItem>
            <SelectItem value="APPROVED">{ar ? "معتمد" : "Approved"}</SelectItem>
            <SelectItem value="REJECTED">{ar ? "مرفوض" : "Rejected"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold">{ar ? "رقم المطالبة" : "Claim #"}</TableHead>
              <TableHead className="text-xs font-semibold">{ar ? "الفترة" : "Period"}</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">{ar ? "المشروع" : "Project"}</TableHead>
              <TableHead className="text-xs font-semibold">{ar ? "المبلغ" : "Amount"}</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">{ar ? "صافي الدفع" : "Net Payment"}</TableHead>
              <TableHead className="text-xs font-semibold hidden sm:table-cell">{ar ? "الحالة" : "Status"}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{ar ? "الإجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item, idx) => {
              const statusCfg = getStatusConfig(item.status);
              const nextStatuses = STATUS_WORKFLOW[item.status] || [];
              return (
                <TableRow key={item.id} className={cn(
                  "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20",
                )}>
                  <TableCell className="font-mono text-xs text-slate-900 dark:text-white">{item.claimNumber || "—"}</TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-slate-300">{item.period || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-300">
                    {ar ? item.project?.name : item.project?.nameEn || item.project?.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-900 dark:text-white tabular-nums">{formatCurrency(Number(item.totalClaimAmount), ar)}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-teal-600 dark:text-teal-400 tabular-nums">{formatCurrency(Number(item.netPayment), ar)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium", statusCfg.color)}>
                      {ar ? statusCfg.ar : statusCfg.en}
                    </span>
                  </TableCell>
                  <TableCell className="text-start">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {nextStatuses.length > 0 && nextStatuses.map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          variant="ghost"
                          size="sm"
                          className={cn("h-7 text-xs",
                            nextStatus === "APPROVED" && "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
                            nextStatus === "REJECTED" && "text-red-600 hover:text-red-700 hover:bg-red-50",
                            nextStatus === "SUBMITTED" && "text-sky-600 hover:text-sky-700 hover:bg-sky-50",
                            nextStatus === "UNDER_REVIEW" && "text-amber-600 hover:text-amber-700 hover:bg-amber-50",
                          )}
                          onClick={() => updateMutation.mutate({ id: item.id, data: { status: nextStatus } })}
                        >
                          {nextStatus === "APPROVED" && <CheckCircle2 className="h-3 w-3 me-1" />}
                          {nextStatus === "REJECTED" && <XCircle className="h-3 w-3 me-1" />}
                          {getStatusConfig(nextStatus)[ar ? "ar" : "en"]}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Inbox className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{ar ? "لا توجد مطالبات" : "No progress claims found"}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditItem(null); setFormData(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? (ar ? "تعديل مطالبة" : "Edit Claim") : (ar ? "مطالبة جديدة" : "New Claim")}</DialogTitle>
            <DialogDescription>{editItem ? (ar ? "تعديل بيانات المطالبة" : "Edit claim details") : (ar ? "إضافة مطالبة تقدم جديدة" : "Add a new progress claim")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "رقم المطالبة" : "Claim #"}</Label>
                <Input value={formData.claimNumber} onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })} className="h-8 text-sm rounded-lg" placeholder="IPC-001" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الفترة" : "Period"}</Label>
                <Input value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} className="h-8 text-sm rounded-lg" placeholder={ar ? "مارس 2025" : "March 2025"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "المشروع" : "Project"} *</Label>
              <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "تاريخ المطالبة" : "Claim Date"}</Label>
              <Input type="date" value={formData.claimDate} onChange={(e) => setFormData({ ...formData, claimDate: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "إجمالي المطالبة" : "Total Claim"}</Label>
                <Input type="number" value={formData.totalClaimAmount} onChange={(e) => setFormData({ ...formData, totalClaimAmount: e.target.value })} className="h-8 text-sm font-mono rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المعتمد سابقاً" : "Previous Certified"}</Label>
                <Input type="number" value={formData.previousCertified} onChange={(e) => setFormData({ ...formData, previousCertified: e.target.value })} className="h-8 text-sm font-mono rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المعتمد حالياً" : "Current Certified"}</Label>
                <Input type="number" value={formData.currentCertified} onChange={(e) => setFormData({ ...formData, currentCertified: e.target.value })} className="h-8 text-sm font-mono rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "مبلغ الاحتجاز" : "Retention"}</Label>
                <Input type="number" value={formData.retentionAmount} onChange={(e) => setFormData({ ...formData, retentionAmount: e.target.value })} className="h-8 text-sm font-mono rounded-lg" />
              </div>
            </div>
            {/* Auto-calculated Net Payment */}
            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">{ar ? "صافي الدفع" : "Net Payment"}</span>
                <span className="text-sm font-bold font-mono text-teal-700 dark:text-teal-300 tabular-nums">{formatCurrency(netPayment, ar)}</span>
              </div>
              <p className="text-[10px] text-teal-500/60 mt-1">{ar ? "المعتمد حالياً - مبلغ الاحتجاز" : "Current Certified − Retention"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => { setShowDialog(false); setEditItem(null); setFormData(emptyForm); }}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg" disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSave}>
              {(createMutation.isPending || updateMutation.isPending) ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
