"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Plus, X, Trash2, Pause, Play, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { VAT_RATE } from "@/lib/constants";

// ===== Types =====

interface TemplateItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface RecurringInvoice {
  id: string;
  name: string;
  nameAr: string | null;
  clientId: string;
  projectId: string | null;
  templateItems: string; // JSON
  notes: string | null;
  notesAr: string | null;
  frequency: string;
  customDays: number | null;
  startDate: string;
  endDate: string | null;
  nextGenerationDate: string;
  isActive: boolean;
  lastGeneratedAt: string | null;
  lastInvoiceId: string | null;
  generationCount: number;
  organizationId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; nameEn?: string };
  project: { id: string; name: string; nameEn?: string; number: string } | null;
  createdBy: { id: string; name: string };
  lastInvoice: { id: string; number: string; status: string; total: number } | null;
  _computed?: { subtotal: number; tax: number; total: number; itemCount: number };
}

interface ClientOption {
  id: string;
  name: string;
  nameEn?: string;
  company?: string;
}

interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

// ===== Form State =====

function getEmptyTemplateItem(): TemplateItem {
  return { description: "", quantity: 1, unitPrice: 0 };
}

interface FormState {
  name: string;
  nameAr: string;
  clientId: string;
  projectId: string;
  items: TemplateItem[];
  notes: string;
  notesAr: string;
  frequency: string;
  customDays: string;
  startDate: string;
  endDate: string;
}

function getEmptyForm(): FormState {
  return {
    name: "",
    nameAr: "",
    clientId: "",
    projectId: "",
    items: [getEmptyTemplateItem()],
    notes: "",
    notesAr: "",
    frequency: "MONTHLY",
    customDays: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  };
}

// ===== Frequency labels =====

const frequencyLabels: Record<string, { en: string; ar: string }> = {
  WEEKLY: { en: "Weekly", ar: "أسبوعي" },
  MONTHLY: { en: "Monthly", ar: "شهري" },
  QUARTERLY: { en: "Quarterly", ar: "ربع سنوي" },
  ANNUALLY: { en: "Annually", ar: "سنوي" },
  CUSTOM: { en: "Custom", ar: "مخصص" },
};

// ===== Main Component =====

interface RecurringInvoicesPageProps {
  language: "ar" | "en";
}

export default function RecurringInvoicesPage({ language }: RecurringInvoicesPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(getEmptyForm());

  // ===== Fetch Data =====

  const { data: recurringData, isLoading } = useQuery({
    queryKey: ["recurring-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/recurring-invoices");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.recurringInvoices || json;
    },
  });

  const recurringInvoices: RecurringInvoice[] = Array.isArray(recurringData) ? recurringData : [];

  const { data: clientsData } = useQuery<ClientOption[]>({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json;
    },
  });
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const { data: projectsData = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const projects = Array.isArray(projectsData) ? projectsData : [];

  // ===== Mutations =====

  const createMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const res = await fetch("/api/recurring-invoices", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          name: data.name,
          nameAr: data.nameAr || undefined,
          clientId: data.clientId,
          projectId: data.projectId || undefined,
          templateItems: data.items,
          notes: data.notes || undefined,
          notesAr: data.notesAr || undefined,
          frequency: data.frequency,
          customDays: data.frequency === "CUSTOM" ? parseInt(data.customDays) || 30 : undefined,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData.error, "Failed to create"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      handleCloseDialog();
      toast.created(ar ? "الفاتورة المتكررة" : "Recurring invoice");
    },
    onError: (error: Error) => {
      toast.showError(
        ar ? `فشل في الإنشاء: ${error.message}` : `Failed to create: ${error.message}`
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormState> }) => {
      const res = await fetch(`/api/recurring-invoices/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData.error, "Failed to update"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      handleCloseDialog();
      toast.updated(ar ? "الفاتورة المتكررة" : "Recurring invoice");
    },
    onError: (error: Error) => {
      toast.showError(
        ar ? `فشل في التحديث: ${error.message}` : `Failed to update: ${error.message}`
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recurring-invoices/${id}`, {
        method: "DELETE",
        headers: getMutationHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData.error, "Failed to delete"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      setDeleteId(null);
      toast.deleted(ar ? "الفاتورة المتكررة" : "Recurring invoice");
    },
    onError: (error: Error) => {
      toast.showError(
        ar ? `فشل في الحذف: ${error.message}` : `Failed to delete: ${error.message}`
      );
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/recurring-invoices/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData.error, "Failed to toggle"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
    },
    onError: (error: Error) => {
      toast.showError(
        ar ? `فشل في التبديل: ${error.message}` : `Failed to toggle: ${error.message}`
      );
    },
  });

  // ===== Form Helpers =====

  const handleOpenCreate = () => {
    setFormData(getEmptyForm());
    setEditId(null);
    setShowDialog(true);
  };

  const handleOpenEdit = (ri: RecurringInvoice) => {
    let items: TemplateItem[] = [];
    try {
      items = JSON.parse(ri.templateItems);
    } catch { /* ignore */ }

    setFormData({
      name: ri.name,
      nameAr: ri.nameAr || "",
      clientId: ri.clientId,
      projectId: ri.projectId || "",
      items: items.length > 0 ? items : [getEmptyTemplateItem()],
      notes: ri.notes || "",
      notesAr: ri.notesAr || "",
      frequency: ri.frequency,
      customDays: ri.customDays?.toString() || "",
      startDate: ri.startDate ? new Date(ri.startDate).toISOString().split("T")[0] : "",
      endDate: ri.endDate ? new Date(ri.endDate).toISOString().split("T")[0] : "",
    });
    setEditId(ri.id);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditId(null);
    setFormData(getEmptyForm());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId || formData.items.length === 0) {
      toast.showError(ar ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    if (editId) {
      updateMutation.mutate({
        id: editId,
        data: {
          name: formData.name,
          nameAr: formData.nameAr || undefined,
          clientId: formData.clientId,
          projectId: formData.projectId || undefined,
          templateItems: JSON.stringify(formData.items),
          notes: formData.notes || undefined,
          notesAr: formData.notesAr || undefined,
          frequency: formData.frequency,
          customDays: formData.frequency === "CUSTOM" ? String(parseInt(formData.customDays) || '') : undefined,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
        } as Record<string, unknown>,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateItem = (idx: number, field: keyof TemplateItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => setFormData({ ...formData, items: [...formData.items, getEmptyTemplateItem()] });
  const removeItem = (idx: number) => {
    if (formData.items.length <= 1) return;
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });
  };

  const calcSubtotal = formData.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const calcTax = calcSubtotal * VAT_RATE;
  const calcTotal = calcSubtotal + calcTax;

  // ===== Stats =====

  const activeCount = recurringInvoices.filter((ri) => ri.isActive).length;
  const pausedCount = recurringInvoices.filter((ri) => !ri.isActive).length;
  const totalMonthlyValue = recurringInvoices
    .filter((ri) => ri.isActive && ri._computed)
    .reduce((sum, ri) => {
      const total = ri._computed!.total;
      switch (ri.frequency) {
        case "WEEKLY": return sum + total * 4.33;
        case "MONTHLY": return sum + total;
        case "QUARTERLY": return sum + total / 3;
        case "ANNUALLY": return sum + total / 12;
        case "CUSTOM": return sum + total * (30 / (ri.customDays || 30));
        default: return sum + total;
      }
    }, 0);

  // ===== Loading =====

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="py-0 gap-0">
              <CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  // ===== Render =====

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {ar ? "الفواتير المتكررة" : "Recurring Invoices"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ar ? "إدارة الفواتير التلقائية المجدولة" : "Manage scheduled automatic invoices"}
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-teal-600 hover:bg-teal-700 text-white h-9 rounded-lg"
        >
          <Plus className="h-4 w-4 me-2" />
          {ar ? "فاتورة متكررة جديدة" : "New Recurring Invoice"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Play className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{ar ? "نشطة" : "Active"}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Pause className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{ar ? "متوقفة" : "Paused"}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{pausedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{ar ? "القيمة الشهرية المقدرة" : "Est. Monthly Value"}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalMonthlyValue, ar)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {recurringInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">{ar ? "لا توجد فواتير متكررة" : "No recurring invoices yet"}</p>
              <p className="text-xs mt-1">{ar ? "أنشئ فاتورة متكررة لإنشاء فواتير تلقائياً" : "Create a recurring invoice to auto-generate invoices"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="text-xs">{ar ? "الاسم" : "Name"}</TableHead>
                    <TableHead className="text-xs">{ar ? "العميل" : "Client"}</TableHead>
                    <TableHead className="text-xs">{ar ? "التكرار" : "Frequency"}</TableHead>
                    <TableHead className="text-xs">{ar ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead className="text-xs">{ar ? "التنفيذ التالي" : "Next Date"}</TableHead>
                    <TableHead className="text-xs">{ar ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="text-xs">{ar ? "الإنشاءات" : "Generated"}</TableHead>
                    <TableHead className="text-xs w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringInvoices.map((ri, idx) => (
                    <TableRow
                      key={ri.id}
                      className={cn(
                        "transition-colors cursor-pointer",
                        idx % 2 === 0
                          ? "bg-white dark:bg-slate-900"
                          : "bg-slate-50/50 dark:bg-slate-800/20",
                        "hover:bg-teal-50/50 dark:hover:bg-teal-950/10"
                      )}
                      onClick={() => handleOpenEdit(ri)}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{ri.name}</p>
                          {ri.nameAr && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{ri.nameAr}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ri.client?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] h-5 border-slate-300 dark:border-slate-600">
                          {frequencyLabels[ri.frequency]
                            ? (ar ? frequencyLabels[ri.frequency].ar : frequencyLabels[ri.frequency].en)
                            : ri.frequency}
                          {ri.frequency === "CUSTOM" && ri.customDays
                            ? ` (${ri.customDays}d)`
                            : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums font-mono">
                        {ri._computed ? formatCurrency(ri._computed.total, ar) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDate(ri.nextGenerationDate, ar)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px] h-5 border-0",
                            ri.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          )}
                        >
                          {ri.isActive
                            ? (ar ? "نشطة" : "Active")
                            : (ar ? "متوقفة" : "Paused")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                        {ri.generationCount}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleActiveMutation.mutate({ id: ri.id, isActive: !ri.isActive })}
                            title={ri.isActive ? (ar ? "إيقاف" : "Pause") : (ar ? "تفعيل" : "Activate")}
                          >
                            {ri.isActive
                              ? <Pause className="h-3.5 w-3.5 text-amber-500" />
                              : <Play className="h-3.5 w-3.5 text-emerald-500" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400"
                            onClick={() => setDeleteId(ri.id)}
                            title={ar ? "حذف" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId
                ? (ar ? "تعديل الفاتورة المتكررة" : "Edit Recurring Invoice")
                : (ar ? "فاتورة متكررة جديدة" : "New Recurring Invoice")}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? (ar ? "تحديث إعدادات الفاتورة المتكررة" : "Update recurring invoice settings")
                : (ar ? "إنشاء فاتورة تتكرر تلقائياً" : "Create an automatically recurring invoice")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "الاسم (إنجليزي)" : "Name (English)"} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={ar ? "رسوم الإشراف الشهرية" : "Monthly Supervision Fee"}
                  className="h-8 text-sm rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                <Input
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="رسوم الإشراف الشهرية"
                  className="h-8 text-sm rounded-lg"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Client & Project */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "العميل" : "Client"} *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(v) => setFormData({ ...formData, clientId: v })}
                >
                  <SelectTrigger className="h-8 text-sm rounded-lg">
                    <SelectValue placeholder={ar ? "اختر عميل" : "Select client"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.company ? ` (${c.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "المشروع" : "Project"}</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(v) => setFormData({ ...formData, projectId: v })}
                >
                  <SelectTrigger className="h-8 text-sm rounded-lg">
                    <SelectValue placeholder={ar ? "اختر مشروع (اختياري)" : "Select project (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {ar ? p.name : p.nameEn || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">{ar ? "بنود الفاتورة" : "Line Items"}</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={addItem}>
                  <Plus className="h-3 w-3 me-1" />
                  {ar ? "إضافة بند" : "Add Item"}
                </Button>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="text-xs">{ar ? "الوصف" : "Description"}</TableHead>
                      <TableHead className="text-xs w-24">{ar ? "الكمية" : "Qty"}</TableHead>
                      <TableHead className="text-xs w-28">{ar ? "سعر الوحدة" : "Unit Price"}</TableHead>
                      <TableHead className="text-xs w-28 text-start">{ar ? "الإجمالي" : "Total"}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, idx) => (
                      <TableRow key={idx} className={cn(
                        "transition-colors hover:bg-teal-50/50 dark:hover:bg-teal-950/10",
                        idx % 2 === 0
                          ? "bg-white dark:bg-slate-900"
                          : "bg-slate-50/50 dark:bg-slate-800/20"
                      )}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                            placeholder={ar ? "وصف البند" : "Item description"}
                            className="h-8 text-xs rounded-lg"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs tabular-nums font-mono rounded-lg"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs tabular-nums font-mono rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-start text-sm font-medium tabular-nums font-mono">
                          {formatCurrency(item.quantity * item.unitPrice, ar)}
                        </TableCell>
                        <TableCell>
                          {formData.items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400"
                              onClick={() => removeItem(idx)}
                              aria-label={ar ? "حذف البند" : "Remove item"}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{ar ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span className="tabular-nums font-mono text-slate-700 dark:text-slate-300">{formatCurrency(calcSubtotal, ar)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{ar ? "الضريبة (5%)" : "Tax (5%)"}</span>
                  <span className="tabular-nums font-mono text-slate-700 dark:text-slate-300">{formatCurrency(calcTax, ar)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  <div className="flex justify-between text-base font-bold">
                    <span>{ar ? "الإجمالي" : "Total"}</span>
                    <span className="text-teal-600 dark:text-teal-400 tabular-nums font-mono">{formatCurrency(calcTotal, ar)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "التكرار" : "Frequency"} *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                >
                  <SelectTrigger className="h-8 text-sm rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">{ar ? "أسبوعي" : "Weekly"}</SelectItem>
                    <SelectItem value="MONTHLY">{ar ? "شهري" : "Monthly"}</SelectItem>
                    <SelectItem value="QUARTERLY">{ar ? "ربع سنوي" : "Quarterly"}</SelectItem>
                    <SelectItem value="ANNUALLY">{ar ? "سنوي" : "Annually"}</SelectItem>
                    <SelectItem value="CUSTOM">{ar ? "مخصص" : "Custom"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.frequency === "CUSTOM" && (
                <div className="space-y-1">
                  <Label className="text-xs">{ar ? "كل (أيام)" : "Every (days)"}</Label>
                  <Input
                    type="number"
                    value={formData.customDays}
                    onChange={(e) => setFormData({ ...formData, customDays: e.target.value })}
                    placeholder="30"
                    min={1}
                    max={365}
                    className="h-8 text-sm rounded-lg"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "تاريخ البدء" : "Start Date"} *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="h-8 text-sm rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "تاريخ الانتهاء" : "End Date"}</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="h-8 text-sm rounded-lg"
                  placeholder={ar ? "غير محدد" : "No end date"}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "ملاحظات (إنجليزي)" : "Notes (English)"}</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={ar ? "ملاحظات إضافية" : "Additional notes"}
                  className="h-8 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "ملاحظات (عربي)" : "Notes (Arabic)"}</Label>
                <Input
                  value={formData.notesAr}
                  onChange={(e) => setFormData({ ...formData, notesAr: e.target.value })}
                  placeholder="ملاحظات إضافية"
                  className="h-8 text-sm rounded-lg"
                  dir="rtl"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {ar ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? (ar ? "جارٍ الحفظ..." : "Saving...")
                  : (ar ? "حفظ" : "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "حذف الفاتورة المتكررة؟" : "Delete Recurring Invoice?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? "سيتم إيقاف الفاتورة المتكررة. لن يتم حذف الفواتير التي تم إنشاؤها مسبقاً."
                : "The recurring invoice will be deactivated. Previously generated invoices will not be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {ar ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
