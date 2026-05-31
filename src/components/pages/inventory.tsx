"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  Layers,
  DollarSign,
  Ban,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Types =====
interface InventoryItem {
  id: string;
  name: string;
  projectId: string | null;
  quantity: number;
  unit: string;
  price: number;
  location: string;
  minimumLevel: number;
  totalValue: number;
  isLowStock: boolean;
  project: { id: string; number: string; name: string; nameEn: string } | null;
  createdAt: string;
}

interface InventoryResponse {
  items: InventoryItem[];
  summary: {
    totalItems: number;
    lowStockCount: number;
    totalValue: number;
  };
}

interface SimpleProject {
  id: string;
  number: string;
  name: string;
  nameEn: string;
}

// ===== Helpers =====
function getStockBarColor(item: InventoryItem): { barColor: string; bgBarColor: string; textColor: string } {
  if (item.quantity === 0) {
    return { barColor: "bg-red-500", bgBarColor: "bg-red-100 dark:bg-red-900/30", textColor: "text-red-600 dark:text-red-400" };
  }
  if (item.isLowStock) {
    return { barColor: "bg-amber-500", bgBarColor: "bg-amber-100 dark:bg-amber-900/30", textColor: "text-amber-600 dark:text-amber-400" };
  }
  return { barColor: "bg-green-500", bgBarColor: "bg-green-100 dark:bg-green-900/30", textColor: "text-green-600 dark:text-green-400" };
}

// ===== Main Component =====
interface InventoryPageProps {
  language: "ar" | "en";
}

export default function InventoryPage({ language }: InventoryPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  // Form state
  const emptyForm = {
    name: "", projectId: "none", quantity: "0", unit: "",
    price: "0", location: "", minimumLevel: "0",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch inventory
  const { data, isLoading } = useQuery<InventoryResponse>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery<SimpleProject[]>({
    queryKey: ["projects-simple"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          ...data,
          projectId: data.projectId === "none" ? null : data.projectId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setShowAddDialog(false);
      setFormData(emptyForm);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          ...data,
          projectId: data.projectId === "none" ? null : data.projectId,
        }),
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEditItem(null);
      setFormData(emptyForm);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/inventory/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const items = useMemo(() => data?.items || [], [data?.items]);
  const summary = useMemo(() => data?.summary || { totalItems: 0, lowStockCount: 0, totalValue: 0 }, [data?.summary]);

  // Computed stats
  const stats = useMemo(() => ({
    total: summary.totalItems,
    inStock: items.filter(i => i.quantity > 0 && !i.isLowStock).length,
    lowStock: summary.lowStockCount,
    outOfStock: items.filter(i => i.quantity === 0).length,
  }), [items, summary]);

  const openEditDialog = (item: InventoryItem) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      projectId: item.projectId || "none",
      quantity: String(item.quantity),
      unit: item.unit,
      price: String(item.price),
      location: item.location,
      minimumLevel: String(item.minimumLevel),
    });
  };

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filter
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.location.toLowerCase().includes(search.toLowerCase()) ||
    item.project?.name.toLowerCase().includes(search.toLowerCase()) ||
    item.project?.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  // Group by location for category grouping
  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredItems.forEach(item => {
      const loc = item.location || (ar ? "بدون موقع" : "No Location");
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
    return groups;
  }, [filteredItems, ar]);

  const hasMultipleLocations = Object.keys(groupedItems).length > 1;

  const statCards = [
    {
      label: ar ? "إجمالي الأصناف" : "Total Items",
      value: stats.total,
      icon: Layers,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: ar ? "متوفر" : "In Stock",
      value: stats.inStock,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: ar ? "منخفض" : "Low Stock",
      value: stats.lowStock,
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: ar ? "نفذ" : "Out of Stock",
      value: stats.outOfStock,
      icon: Ban,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
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
                  <p className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Value Card */}
      <Card className="border-slate-200 dark:border-slate-700/50 bg-gradient-to-l from-teal-50 to-sky-50 dark:from-teal-950/20 dark:to-sky-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي قيمة المخزون" : "Total Inventory Value"}</p>
              <p className="text-xl font-bold text-teal-700 dark:text-teal-300 font-mono tabular-nums">
                {formatCurrency(summary.totalValue, ar)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {ar ? "المخزون" : "Inventory"}
          </h2>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث عن صنف..." : "Search items..."}
              className="ps-9 h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { setFormData(emptyForm); setShowAddDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {ar ? "صنف جديد" : "New Item"}
          </Button>
        </div>
      </div>

      {/* Table - with Location Grouping */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent sticky top-0 bg-white dark:bg-slate-900 z-10">
                <TableHead>{ar ? "الاسم" : "Name"}</TableHead>
                <TableHead className="hidden md:table-cell">{ar ? "المشروع" : "Project"}</TableHead>
                <TableHead>{ar ? "الكمية" : "Qty"}</TableHead>
                <TableHead className="hidden sm:table-cell">{ar ? "مستوى المخزون" : "Stock Level"}</TableHead>
                <TableHead className="hidden lg:table-cell">{ar ? "السعر" : "Price"}</TableHead>
                <TableHead className="hidden lg:table-cell">{ar ? "القيمة" : "Value"}</TableHead>
                <TableHead className="hidden md:table-cell">{ar ? "الموقع" : "Location"}</TableHead>
                <TableHead className="text-start">{ar ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {ar ? "لا توجد أصناف" : "No items found"}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {Object.entries(groupedItems).map(([location, locItems]) => (
                    <GroupedRows
                      key={location}
                      location={location}
                      items={locItems}
                      ar={ar}
                      hasMultipleLocations={hasMultipleLocations}
                      onEdit={openEditDialog}
                      onDelete={(id, name) => {
                        if (confirm(ar ? `حذف "${name}"؟` : `Delete "${name}"?`)) {
                          deleteMutation.mutate(id);
                        }
                      }}
                    />
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editItem}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditItem(null); setFormData(emptyForm); }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem ? (ar ? "تعديل صنف" : "Edit Item") : (ar ? "صنف جديد" : "New Item")}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? (ar ? "تعديل بيانات الصنف" : "Edit item information")
                : (ar ? "إضافة صنف جديد للمخزون" : "Add a new inventory item")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "اسم الصنف" : "Item Name"} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={ar ? "مثال: أسمنت بورتلاندي" : "e.g., Portland Cement"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المشروع" : "Project"} ({ar ? "اختياري" : "optional"})</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={ar ? "بدون مشروع" : "No project"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ar ? "بدون مشروع" : "No project"}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.number} — {ar ? p.name : p.nameEn || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الوحدة" : "Unit"}</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder={ar ? "مثال: كيس, طن, متر" : "e.g., bag, ton, m"}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الكمية" : "Quantity"}</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "السعر" : "Price"} ({ar ? "د.إ" : "AED"})</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الحد الأدنى" : "Min Level"}</Label>
                <Input
                  type="number"
                  value={formData.minimumLevel}
                  onChange={(e) => setFormData({ ...formData, minimumLevel: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "الموقع" : "Location"}</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={ar ? "مثال: المستودع A, الموقع 1" : "e.g., Warehouse A, Site 1"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAddDialog(false); setEditItem(null); setFormData(emptyForm); }}
            >
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSave}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? (ar ? "جارٍ الحفظ..." : "Saving...")
                : (ar ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Grouped Rows Component =====
function GroupedRows({
  location,
  items,
  ar,
  hasMultipleLocations,
  onEdit,
  onDelete,
}: {
  location: string;
  items: InventoryItem[];
  ar: boolean;
  hasMultipleLocations: boolean;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <>
      {hasMultipleLocations && (
        <TableRow className="bg-slate-100 dark:bg-slate-800/50 hover:bg-transparent">
          <TableCell colSpan={8} className="py-1.5 px-4">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              📍 {location} ({items.length} {ar ? "أصناف" : "items"})
            </span>
          </TableCell>
        </TableRow>
      )}
      {items.map((item) => {
        const stockColors = getStockBarColor(item);
        const maxQty = Math.max(item.quantity, item.minimumLevel, 1);
        const pct = Math.min(100, Math.round((item.quantity / maxQty) * 100));
        const isOut = item.quantity === 0;
        return (
          <TableRow
            key={item.id}
            className={`group even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
              isOut ? "bg-red-50/60 dark:bg-red-950/10" : item.isLowStock ? "bg-amber-50/60 dark:bg-amber-950/10" : ""
            }`}
          >
            <TableCell className="font-medium text-slate-900 dark:text-white">
              <div className="flex items-center gap-1.5">
                {isOut ? (
                  <Ban className="h-3.5 w-3.5 text-red-500" />
                ) : item.isLowStock ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <Package className="h-3.5 w-3.5 text-green-500" />
                )}
                {item.name}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell text-xs text-slate-500">
              {item.project ? (ar ? item.project?.name : item.project?.nameEn || item.project?.name) : "—"}
            </TableCell>
            <TableCell>
              <span className={`tabular-nums font-bold text-sm ${stockColors.textColor}`}>
                {item.quantity.toLocaleString(ar ? "ar-AE" : "en-US")}
              </span>
              <span className="text-[10px] text-slate-400 ms-1">{item.unit || ""}</span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <div className="flex items-center gap-2 min-w-[100px]">
                <div className={`flex-1 h-2 rounded-full ${stockColors.bgBarColor} overflow-hidden`}>
                  <div
                    className={`h-full rounded-full ${stockColors.barColor} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 tabular-nums w-8 text-end">
                  {item.minimumLevel > 0 ? `/${item.minimumLevel}` : ""}
                </span>
              </div>
            </TableCell>
            <TableCell className="hidden lg:table-cell text-xs tabular-nums text-slate-500 font-mono">
              {formatCurrency(item.price, ar)}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-xs tabular-nums font-medium text-slate-700 dark:text-slate-300 font-mono">
              {formatCurrency(item.totalValue, ar)}
            </TableCell>
            <TableCell className="hidden md:table-cell text-xs text-slate-500">
              {!hasMultipleLocations ? (item.location || "—") : ""}
            </TableCell>
            <TableCell className="text-start">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={ar ? "start" : "end"}>
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Pencil className="me-2 h-3.5 w-3.5" />
                    {ar ? "تعديل" : "Edit"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400"
                    onClick={() => onDelete(item.id, item.name)}
                  >
                    <Trash2 className="me-2 h-3.5 w-3.5" />
                    {ar ? "حذف" : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
