"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
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
  AlertTriangle,
  Shield,
  Building2,
} from "lucide-react";

// ===== Types =====
interface GuaranteeLetterItem {
  id: string;
  organizationId: string | null;
  projectId: string;
  type: string;
  guaranteeNumber: string;
  bankName: string;
  amount: number;
  currency: string;
  issueDate: string | null;
  expiryDate: string | null;
  status: string;
  beneficiaryName: string;
  documentUrl: string;
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
    ACTIVE: {
      ar: "نشط", en: "Active",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    EXPIRED: {
      ar: "منتهي", en: "Expired",
      color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    },
    RELEASED: {
      ar: "مُفرج", en: "Released",
      color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    CLAIMED: {
      ar: "مطالب به", en: "Claimed",
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    },
  };
  return configs[status] || configs.ACTIVE;
}

function getTypeLabel(type: string, ar: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    PERFORMANCE: { ar: "ضمان أداء", en: "Performance" },
    ADVANCE_PAYMENT: { ar: "ضمان دفعة مقدمة", en: "Advance Payment" },
    RETENTION: { ar: "ضمان احتجاز", en: "Retention" },
    BID_BOND: { ar: "ضمان مناقصة", en: "Bid Bond" },
  };
  return ar ? (labels[type]?.ar || type) : (labels[type]?.en || type);
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return new Date(expiryDate) <= thirtyDaysFromNow && new Date(expiryDate) >= new Date();
}

// ===== Main Component =====
interface GuaranteeLettersPageProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function GuaranteeLettersPage({ language, projectId }: GuaranteeLettersPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<GuaranteeLetterItem | null>(null);

  const emptyForm = {
    projectId: projectId || "",
    type: "PERFORMANCE",
    guaranteeNumber: "",
    bankName: "",
    amount: "0",
    currency: "AED",
    issueDate: "",
    expiryDate: "",
    beneficiaryName: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch guarantee letters
  const { data: guarantees = [], isLoading } = useQuery<GuaranteeLetterItem[]>({
    queryKey: ["guarantee-letters", filterProject],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject && filterProject !== "all") params.set("projectId", filterProject);
      if (filterType && filterType !== "all") params.set("type", filterType);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/guarantee-letters?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/guarantee-letters", {
        method: "POST", headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guarantee-letters"] });
      setShowDialog(false);
      setFormData(emptyForm);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/guarantee-letters/${id}`, {
        method: "PUT", headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guarantee-letters"] });
      setEditItem(null);
      setFormData(emptyForm);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/guarantee-letters/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guarantee-letters"] });
    },
  });

  const filtered = guarantees.filter((g) => {
    const matchSearch = g.guaranteeNumber.toLowerCase().includes(search.toLowerCase()) ||
      g.bankName.toLowerCase().includes(search.toLowerCase()) ||
      (ar ? g.project.name : g.project.nameEn || g.project.name).toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || g.type === filterType;
    const matchStatus = filterStatus === "all" || g.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // Summary
  const activeGuarantees = filtered.filter((g) => g.status === "ACTIVE");
  const activeTotal = activeGuarantees.reduce((s, g) => s + Number(g.amount), 0);
  const expiringSoon = activeGuarantees.filter((g) => isExpiringSoon(g.expiryDate));
  const expiredCount = filtered.filter((g) => g.status === "EXPIRED").length;
  const releasedCount = filtered.filter((g) => g.status === "RELEASED").length;

  const openEditDialog = (item: GuaranteeLetterItem) => {
    setEditItem(item);
    setFormData({
      projectId: item.projectId,
      type: item.type,
      guaranteeNumber: item.guaranteeNumber,
      bankName: item.bankName,
      amount: String(item.amount),
      currency: item.currency,
      issueDate: item.issueDate ? item.issueDate.split("T")[0] : "",
      expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "",
      beneficiaryName: item.beneficiaryName,
    });
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
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Shield className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "خطابات الضمان" : "Guarantee Letters"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {ar ? "ضمانات بنكية للأداء والدفع المقدم والاحتجاز" : "Bank guarantees for performance, advance payment & retention"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={() => { setFormData(emptyForm); setEditItem(null); setShowDialog(true); }}>
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "ضمان جديد" : "New Guarantee"}
          </Button>
        </div>
      </div>

      {/* Expiry Alert */}
      {expiringSoon.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            {ar
              ? `${expiringSoon.length} ضمان ينتهي خلال 30 يوم!`
              : `${expiringSoon.length} guarantee(s) expiring within 30 days!`}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20"><Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /></div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{ar ? "النشطة" : "Active"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{formatCurrency(activeTotal, ar)}</div>
            <p className="text-[10px] text-emerald-500/60 mt-1">{activeGuarantees.length} {ar ? "ضمان" : "guarantees"}</p>
          </div>
        </Card>
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20"><AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /></div>
              <span className="text-xs text-amber-600 dark:text-amber-400">{ar ? "تنتهي قريباً" : "Expiring Soon"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{expiringSoon.length}</div>
            <p className="text-[10px] text-amber-500/60 mt-1">{ar ? "خلال 30 يوم" : "Within 30 days"}</p>
          </div>
        </Card>
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20"><FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /></div>
              <span className="text-xs text-red-600 dark:text-red-400">{ar ? "منتهية" : "Expired"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{expiredCount}</div>
          </div>
        </Card>
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20"><Building2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /></div>
              <span className="text-xs text-slate-600 dark:text-slate-400">{ar ? "مُفرج عنها" : "Released"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{releasedCount}</div>
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
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg"><SelectValue placeholder={ar ? "النوع" : "Type"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
            <SelectItem value="PERFORMANCE">{ar ? "ضمان أداء" : "Performance"}</SelectItem>
            <SelectItem value="ADVANCE_PAYMENT">{ar ? "دفعة مقدمة" : "Advance Payment"}</SelectItem>
            <SelectItem value="RETENTION">{ar ? "احتجاز" : "Retention"}</SelectItem>
            <SelectItem value="BID_BOND">{ar ? "مناقصة" : "Bid Bond"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"><SelectValue placeholder={ar ? "الحالة" : "Status"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
            <SelectItem value="ACTIVE">{ar ? "نشط" : "Active"}</SelectItem>
            <SelectItem value="EXPIRED">{ar ? "منتهي" : "Expired"}</SelectItem>
            <SelectItem value="RELEASED">{ar ? "مُفرج" : "Released"}</SelectItem>
            <SelectItem value="CLAIMED">{ar ? "مطالب" : "Claimed"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold">{ar ? "النوع" : "Type"}</TableHead>
              <TableHead className="text-xs font-semibold">{ar ? "رقم الضمان" : "Guarantee #"}</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">{ar ? "البنك" : "Bank"}</TableHead>
              <TableHead className="text-xs font-semibold">{ar ? "المبلغ" : "Amount"}</TableHead>
              <TableHead className="text-xs font-semibold hidden sm:table-cell">{ar ? "الانتهاء" : "Expiry"}</TableHead>
              <TableHead className="text-xs font-semibold hidden sm:table-cell">{ar ? "الحالة" : "Status"}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{ar ? "الإجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item, idx) => {
              const statusCfg = getStatusConfig(item.status);
              const expiring = isExpiringSoon(item.expiryDate);
              return (
                <TableRow key={item.id} className={cn(
                  "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20",
                  expiring && "bg-amber-50/50 dark:bg-amber-950/10",
                )}>
                  <TableCell>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                      item.type === "PERFORMANCE" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" :
                      item.type === "ADVANCE_PAYMENT" ? "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" :
                      item.type === "RETENTION" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" :
                      "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                    )}>
                      {getTypeLabel(item.type, ar)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-900 dark:text-white">{item.guaranteeNumber || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-300">{item.bankName}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-900 dark:text-white tabular-nums">{formatCurrency(Number(item.amount), ar)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-slate-500">
                    <span className={cn(expiring && "text-amber-600 dark:text-amber-400 font-medium")}>
                      {item.expiryDate ? formatDate(item.expiryDate, ar) : "—"}
                      {expiring && " ⚠"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium", statusCfg.color)}>
                      {ar ? statusCfg.ar : statusCfg.en}
                    </span>
                  </TableCell>
                  <TableCell className="text-start">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { openEditDialog(item); setShowDialog(true); }} aria-label="Edit">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => {
                        if (confirm(ar ? "حذف هذا الضمان؟" : "Delete this guarantee?")) deleteMutation.mutate(item.id);
                      }} aria-label="Delete">
                        <Inbox className="h-3.5 w-3.5" />
                      </Button>
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
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{ar ? "لا توجد خطابات ضمان" : "No guarantee letters found"}</p>
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
            <DialogTitle>{editItem ? (ar ? "تعديل ضمان" : "Edit Guarantee") : (ar ? "ضمان جديد" : "New Guarantee")}</DialogTitle>
            <DialogDescription>{editItem ? (ar ? "تعديل بيانات الضمان" : "Edit guarantee details") : (ar ? "إضافة ضمان بنكي جديد" : "Add a new bank guarantee")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "المشروع" : "Project"} *</Label>
              <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "النوع" : "Type"}</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERFORMANCE">{ar ? "ضمان أداء" : "Performance"}</SelectItem>
                    <SelectItem value="ADVANCE_PAYMENT">{ar ? "دفعة مقدمة" : "Advance Payment"}</SelectItem>
                    <SelectItem value="RETENTION">{ar ? "احتجاز" : "Retention"}</SelectItem>
                    <SelectItem value="BID_BOND">{ar ? "مناقصة" : "Bid Bond"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "رقم الضمان" : "Guarantee #"}</Label>
                <Input value={formData.guaranteeNumber} onChange={(e) => setFormData({ ...formData, guaranteeNumber: e.target.value })} className="h-8 text-sm rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "البنك" : "Bank"}</Label>
                <Input value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} className="h-8 text-sm rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المبلغ" : "Amount"}</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="h-8 text-sm font-mono rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "تاريخ الإصدار" : "Issue Date"}</Label>
                <Input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="h-8 text-sm rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "تاريخ الانتهاء" : "Expiry Date"}</Label>
                <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="h-8 text-sm rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "اسم المستفيد" : "Beneficiary"}</Label>
              <Input value={formData.beneficiaryName} onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            {editItem && (
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الحالة" : "Status"}</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{ar ? "نشط" : "Active"}</SelectItem>
                    <SelectItem value="EXPIRED">{ar ? "منتهي" : "Expired"}</SelectItem>
                    <SelectItem value="RELEASED">{ar ? "مُفرج" : "Released"}</SelectItem>
                    <SelectItem value="CLAIMED">{ar ? "مطالب" : "Claimed"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
