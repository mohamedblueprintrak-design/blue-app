"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, getErrorMessage, type SupplierFormData } from "@/lib/validations";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Star,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  TrendingUp,
  Award,
  Users,
} from "lucide-react";

// ===== Types =====
interface Supplier {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  creditLimit: number;
  _count: { purchaseOrders: number };
  createdAt: string;
}

// ===== Helpers =====
const categoryLabels: Record<string, { ar: string; en: string }> = {
  MATERIALS: { ar: "مواد", en: "Materials" },
  EQUIPMENT: { ar: "معدات", en: "Equipment" },
  SERVICES: { ar: "خدمات", en: "Services" },
  SUBCONTRACTORS: { ar: "مقاولين من الباطن", en: "Subcontractors" },
};

const categoryColors: Record<string, string> = {
  MATERIALS: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  EQUIPMENT: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  SERVICES: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
  SUBCONTRACTORS: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
};

const categoryDotColors: Record<string, string> = {
  MATERIALS: "bg-blue-500",
  EQUIPMENT: "bg-purple-500",
  SERVICES: "bg-teal-500",
  SUBCONTRACTORS: "bg-amber-500",
};

function getPerformanceDot(rating: number): { color: string; label: string; labelAr: string } {
  if (rating >= 4) return { color: "bg-green-500", label: "Excellent", labelAr: "ممتاز" };
  if (rating >= 3) return { color: "bg-amber-500", label: "Good", labelAr: "جيد" };
  if (rating >= 1) return { color: "bg-red-500", label: "Needs Improvement", labelAr: "يحتاج تحسين" };
  return { color: "bg-slate-400", label: "Not Rated", labelAr: "غير مصنف" };
}

function StarRating({ rating, onChange, size = "sm" }: { rating: number; onChange?: (r: number) => void; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${starSize} ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300 dark:text-slate-600"
          } ${onChange ? "cursor-pointer hover:text-amber-400 hover:scale-110 transition-all" : "transition-colors"}`}
          onClick={() => onChange?.(star)}
        />
      ))}
    </div>
  );
}

// ===== Main Component =====
interface SuppliersPageProps {
  language: "ar" | "en";
}

export default function SuppliersPage({ language }: SuppliersPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  // Form state
  const emptyForm = {
    name: "", category: "MATERIALS" as SupplierFormData["category"], email: "", phone: "",
    address: "", rating: "0", creditLimit: "0",
  };
  const [_formData, setFormData] = useState(emptyForm);

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema) as unknown as Resolver<SupplierFormData>,
    defaultValues: emptyForm,
  });
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, setValue, watch } = form;

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", categoryFilter],
    queryFn: async () => {
      const params = categoryFilter !== "all" ? `?category=${categoryFilter}` : "";
      const res = await fetch(`/api/suppliers${params}`);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
  });

  // Computed stats
  const stats = useMemo(() => ({
    total: suppliers.length,
    ACTIVE: suppliers.filter(s => s._count.purchaseOrders > 0).length,
    topRated: suppliers.filter(s => s.rating >= 4).length,
  }), [suppliers]);

  const statCards = [
    {
      label: ar ? "إجمالي الموردين" : "Total Suppliers",
      value: stats.total,
      icon: Users,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      label: ar ? "نشط" : "Active",
      value: stats.ACTIVE,
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-100 dark:bg-teal-900/30",
    },
    {
      label: ar ? "ذو تقييم عالي" : "Top Rated",
      value: stats.topRated,
      icon: Award,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create supplier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowAddDialog(false);
      setFormData(emptyForm);
      toast.created(ar ? "المورد" : "Supplier");
    },
    onError: () => {
      toast.error(ar ? "إنشاء المورد" : "Create supplier");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update supplier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setEditSupplier(null);
      setFormData(emptyForm);
      toast.updated(ar ? "المورد" : "Supplier");
    },
    onError: () => {
      toast.error(ar ? "تحديث المورد" : "Update supplier");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE", headers: getMutationHeaders() });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(extractErrorMessage(data.error, "Failed to delete"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.deleted(ar ? "المورد" : "Supplier");
    },
    onError: () => {
      toast.error(ar ? "حذف المورد" : "Delete supplier");
    },
  });

  const openEditDialog = (supplier: Supplier) => {
    setEditSupplier(supplier);
    const values = {
      name: supplier.name,
      category: supplier.category as SupplierFormData["category"],
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      rating: String(supplier.rating),
      creditLimit: String(supplier.creditLimit),
    };
    setFormData(values);
    reset(values);
  };

  const handleSave = (data: SupplierFormData) => {
    if (editSupplier) {
      updateMutation.mutate({ id: editSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter
  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            {ar ? "الموردين" : "Suppliers"}
          </h2>
          <Badge variant="secondary" className="text-xs">{suppliers.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث..." : "Search..."}
              className="ps-9 h-8 text-sm"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder={ar ? "التصنيف" : "Category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{ar ? label.ar : label.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { setFormData(emptyForm); setShowAddDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {ar ? "مورد جديد" : "New Supplier"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{ar ? "الاسم" : "Name"}</TableHead>
                <TableHead>{ar ? "التصنيف" : "Category"}</TableHead>
                <TableHead className="hidden md:table-cell">{ar ? "البريد" : "Email"}</TableHead>
                <TableHead className="hidden sm:table-cell">{ar ? "الهاتف" : "Phone"}</TableHead>
                <TableHead>{ar ? "التقييم" : "Rating"}</TableHead>
                <TableHead className="hidden sm:table-cell">{ar ? "حد الائتمان" : "Credit Limit"}</TableHead>
                <TableHead className="hidden lg:table-cell">{ar ? "الأداء" : "Performance"}</TableHead>
                <TableHead className="text-start">{ar ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {ar ? "لا يوجد موردين" : "No suppliers found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const perf = getPerformanceDot(supplier.rating);
                  return (
                    <TableRow
                      key={supplier.id}
                      className="group even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${categoryDotColors[supplier.category] || "bg-slate-400"}`} />
                          {supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] h-5 rounded-full ${categoryColors[supplier.category] || ""}`}>
                          {ar
                            ? categoryLabels[supplier.category]?.ar || supplier.category
                            : categoryLabels[supplier.category]?.en || supplier.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">
                        {supplier.email || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-slate-500">
                        {supplier.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={supplier.rating} />
                          {supplier.rating > 0 && (
                            <span className="text-[10px] text-slate-400 tabular-nums">{supplier.rating}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300 tabular-nums font-mono">
                        {formatCurrency(supplier.creditLimit, ar)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${perf.color}`} />
                          <span className="text-[10px] text-slate-500">
                            {ar ? perf.labelAr : perf.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-start">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={ar ? "start" : "end"}>
                            <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                              <Pencil className="me-2 h-3.5 w-3.5" />
                              {ar ? "تعديل" : "Edit"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => {
                                if (confirm(ar ? `حذف المورد "${supplier.name}"؟` : `Delete "${supplier.name}"?`)) {
                                  deleteMutation.mutate(supplier.id);
                                }
                              }}
                            >
                              <Trash2 className="me-2 h-3.5 w-3.5" />
                              {ar ? "حذف" : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editSupplier}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditSupplier(null); setFormData(emptyForm); }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editSupplier ? (ar ? "تعديل مورد" : "Edit Supplier") : (ar ? "مورد جديد" : "New Supplier")}
            </DialogTitle>
            <DialogDescription>
              {editSupplier
                ? (ar ? "تعديل بيانات المورد" : "Edit supplier information")
                : (ar ? "إضافة مورد جديد" : "Add a new supplier")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={rhfHandleSubmit(handleSave as (data: unknown) => void)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الاسم" : "Name"} *</Label>
                <Input
                  {...register("name")}
                  placeholder={ar ? "اسم المورد" : "Supplier name"}
                  className={cn(errors.name && "border-red-500")}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.name.message || "", ar)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "التصنيف" : "Category"}</Label>
                <Select
                  // eslint-disable-next-line react-hooks/incompatible-library
                  value={watch("category")}
                  onValueChange={(v) => setValue("category", v as SupplierFormData["category"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{ar ? label.ar : label.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "البريد" : "Email"}</Label>
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="email@example.com"
                  className={cn(errors.email && "border-red-500")}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.email.message || "", ar)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الهاتف" : "Phone"}</Label>
                <Input
                  {...register("phone")}
                  placeholder="+971 XX XXX XXXX"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "العنوان" : "Address"}</Label>
              <Input
                {...register("address")}
                placeholder={ar ? "عنوان المورد" : "Supplier address"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "التقييم" : "Rating"}</Label>
                <Select
                  value={watch("rating")}
                  onValueChange={(v) => setValue("rating", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{ar ? "بدون تقييم" : "No rating"}</SelectItem>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)} className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${s <= r ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                            />
                          ))}
                        </div>
                        <span className="ms-2">{r}/5</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {Number(watch("rating")) > 0 && (
                  <div className="mt-1">
                    <StarRating rating={Number(watch("rating"))} onChange={(r) => setValue("rating", String(r))} size="md" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "حد الائتمان" : "Credit Limit"} ({ar ? "د.إ" : "AED"})</Label>
                <Input
                  type="number"
                  {...register("creditLimit")}
                  placeholder="0"
                />
              </div>
            </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowAddDialog(false); setEditSupplier(null); setFormData(emptyForm); reset(); }}
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
