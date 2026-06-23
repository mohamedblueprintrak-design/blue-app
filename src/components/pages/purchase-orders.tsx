"use client";


import { useTranslations } from 'next-intl';
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/ui/status-icon";
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
  ShoppingCart,
  CheckCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  Minus,
  Clock,
  FileCheck,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Types =====
interface PurchaseOrderItem {
  id?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  projectId: string | null;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string; category: string };
  project: { id: string; number: string; name: string; nameEn: string } | null;
  items: PurchaseOrderItem[];
  _count: { items: number };
}

interface PurchaseOrdersResponse {
  orders: PurchaseOrder[];
  summary: {
    totalOrders: number;
    totalAmount: number;
    pendingApproval: number;
  };
}

interface SimpleSupplier {
  id: string;
  name: string;
  category: string;
}

interface SimpleProject {
  id: string;
  number: string;
  name: string;
  nameEn: string;
}

// ===== Helpers =====
const statusConfig: Record<string, { ar: string; en: string; color: string }> = {
  DRAFT: { ar: "مسودة", en: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  SUBMITTED: { ar: "مقدمة", en: "Submitted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  APPROVED: { ar: "معتمدة", en: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  RECEIVED: { ar: "مستلمة", en: "Received", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
  CANCELLED: { ar: "ملغاة", en: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
};

function isHighValue(amount: number) {
  return amount >= 50000;
}

// ===== Main Component =====
interface PurchaseOrdersPageProps {
  language: "ar" | "en";
}

export default function PurchaseOrdersPage({ language }: PurchaseOrdersPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

  // Form state
  const emptyLineItem = { itemName: "", quantity: "1", unitPrice: "0", total: "0" };
  const emptyForm = {
    number: "", supplierId: "", projectId: "none",
    status: "DRAFT", amount: "0",
    items: [{ ...emptyLineItem }] as { itemName: string; quantity: string; unitPrice: string; total: string }[],
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch orders
  const { data, isLoading } = useQuery<PurchaseOrdersResponse>({
    queryKey: ["purchase-orders", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/purchase-orders${params}`);
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
      const json = await res.json(); return json.data || json;
    },
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<SimpleSupplier[]>({
    queryKey: ["suppliers-simple"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<SimpleProject[]>({
    queryKey: ["projects-simple"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  const orders = useMemo(() => data?.orders || [], [data?.orders]);
  const summary = useMemo(() => data?.summary || { totalOrders: 0, totalAmount: 0, pendingApproval: 0 }, [data?.summary]);

  // Computed stats
  const stats = useMemo(() => ({
    total: summary.totalOrders,
    PENDING: summary.pendingApproval,
    APPROVED: orders.filter(o => o.status === "APPROVED" || o.status === "RECEIVED").length,
    totalValue: summary.totalAmount,
  }), [orders, summary]);

  const statCards = [
    {
      label: tAuto('auto.totalPOs'),
      value: stats.total,
      icon: ShoppingCart,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: tAuto('auto.pending'),
      value: stats.PENDING,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: tAuto('auto.approved'),
      value: stats.APPROVED,
      icon: FileCheck,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: tAuto('auto.totalValue'),
      value: formatCurrency(stats.totalValue, ar),
      icon: DollarSign,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-100 dark:bg-teal-900/30",
      isText: true,
    },
  ];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const items = data.items.map((item) => ({
        itemName: item.itemName,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        total: parseFloat(item.total) || 0,
      }));
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          number: data.number,
          supplierId: data.supplierId,
          projectId: data.projectId === "none" ? null : data.projectId,
          amount: data.amount,
          items,
        }),
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setShowAddDialog(false);
      setFormData(emptyForm);
    },
  });

  // Update mutation (status change)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setViewOrder(null);
    },
  });

  // Update mutation (full edit)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const items = data.items.map((item) => ({
        itemName: item.itemName,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        total: parseFloat(item.total) || 0,
      }));
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          number: data.number,
          supplierId: data.supplierId,
          projectId: data.projectId === "none" ? null : data.projectId,
          amount: data.amount,
          status: data.status,
          items,
        }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setEditOrder(null);
      setFormData(emptyForm);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/purchase-orders/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const openEditDialog = (order: PurchaseOrder) => {
    setEditOrder(order);
    setFormData({
      number: order.number,
      supplierId: order.supplierId,
      projectId: order.projectId || "none",
      status: order.status,
      amount: String(order.amount),
      items: order.items.length > 0
        ? order.items.map((item) => ({
            itemName: item.itemName,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            total: String(item.total),
          }))
        : [{ ...emptyLineItem }],
    });
  };

  const handleSave = () => {
    if (editOrder) {
      updateMutation.mutate({ id: editOrder.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Line items management
  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ...emptyLineItem }],
    });
  };

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unitPrice) || 0;
      newItems[index].total = String(qty * price);
    }
    // Auto-calc total amount
    const totalAmount = newItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    setFormData({ ...formData, items: newItems, amount: String(totalAmount) });
  };

  // Filter
  const filteredOrders = orders.filter((o) =>
    o.number.toLowerCase().includes(search.toLowerCase()) ||
    o.supplier?.name.toLowerCase().includes(search.toLowerCase()) ||
    o.project?.name.toLowerCase().includes(search.toLowerCase())
  );

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
                  <p className={`font-bold text-slate-900 dark:text-white tabular-nums ${card.isText ? "text-base" : "text-xl"}`}>
                    {card.value}
                  </p>
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
            {tAuto('auto.purchaseOrders')}
          </h2>
          <Badge variant="secondary" className="text-xs">{orders.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tAuto('auto.search1')}
              className="ps-9 h-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder={tAuto('auto.status1')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{ar ? cfg.ar : cfg.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { setFormData(emptyForm); setShowAddDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {tAuto('auto.newPO')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{tAuto('auto.number')}</TableHead>
                <TableHead>{tAuto('auto.supplier')}</TableHead>
                <TableHead className="hidden md:table-cell">{tAuto('auto.project')}</TableHead>
                <TableHead>{tAuto('auto.amount')}</TableHead>
                <TableHead>{tAuto('auto.status1')}</TableHead>
                <TableHead className="hidden sm:table-cell">{tAuto('auto.date')}</TableHead>
                <TableHead className="text-start">{tAuto('auto.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {tAuto('auto.noPurchaseOrdersFound')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const cfg = statusConfig[order.status] || statusConfig.DRAFT;
                  const highValue = isHighValue(order.amount);
                  // Days since creation for countdown
                  const daysSinceCreation = Math.floor(
                    (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <TableRow
                      key={order.id}
                      className={`group even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        highValue ? "border-s-2 border-s-teal-200 dark:border-s-teal-800/50" : ""
                      }`}
                    >
                      <TableCell className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          {highValue && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          )}
                          {order.number}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                        {order.supplier.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">
                        {order.project ? (ar ? order.project.name : order.project.nameEn || order.project.name) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm tabular-nums font-semibold font-mono ${highValue ? "text-teal-700 dark:text-teal-300" : "text-slate-900 dark:text-white"}`}>
                          {formatCurrency(order.amount, ar)}
                        </span>
                        {highValue && (
                          <Badge variant="secondary" className="text-[9px] h-4 ms-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-0">
                            {tAuto('auto.highValue')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon status={order.status} className="h-3 w-3" />
                          <Badge variant="secondary" className={`text-[10px] h-5 flex items-center gap-1 ${cfg.color}`}>
                            {ar ? cfg.ar : cfg.en}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                        </div>
                        {order.status === "SUBMITTED" && (
                          <Badge variant="secondary" className="text-[9px] h-4 mt-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-0">
                            {ar ? `منذ ${daysSinceCreation} يوم` : `${daysSinceCreation}d ago`}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewOrder(order)} aria-label="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {/* Approve workflow buttons */}
                          {order.status === "SUBMITTED" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                onClick={() => updateStatusMutation.mutate({ id: order.id, status: "APPROVED" })}
                                title={tAuto('auto.approve')}
                                aria-label="Approve"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                onClick={() => updateStatusMutation.mutate({ id: order.id, status: "CANCELLED" })}
                                title={tAuto('auto.reject')}
                                aria-label="Reject"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {order.status === "APPROVED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-teal-600 hover:text-teal-700"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: "RECEIVED" })}
                              title={tAuto('auto.markReceived')}
                              aria-label="Mark received"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(order.status === "DRAFT" || order.status === "SUBMITTED") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={ar ? "start" : "end"}>
                                <DropdownMenuItem onClick={() => openEditDialog(order)}>
                                  <Pencil className="me-2 h-3.5 w-3.5" />
                                  {tAuto('auto.edit')}
                                </DropdownMenuItem>
                                {order.status === "DRAFT" && (
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id, status: "SUBMITTED" })}>
                                    <ArrowRight className="me-2 h-3.5 w-3.5" />
                                    {tAuto('auto.submit')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => {
                                    if (confirm(ar ? `حذف الطلب ${order.number}؟` : `Delete PO ${order.number}?`)) {
                                      deleteMutation.mutate(order.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="me-2 h-3.5 w-3.5" />
                                  {tAuto('auto.delete')}
                                </DropdownMenuItem>
                                {order.status === "DRAFT" && (
                                  <DropdownMenuItem
                                    className="text-teal-600 dark:text-teal-400"
                                    onClick={() => {
                                      fetch("/api/approvals", {
                                        method: "POST",
                                        headers: getMutationHeaders(),
                                        body: JSON.stringify({
                                          entityType: "purchase_order",
                                          entityId: order.id,
                                          title: `${tAuto('auto.pOApproval')} - ${order.number}`,
                                          description: order.supplier.name,
                                          requestedBy: "المستخدم الحالي",
                                          assignedTo: "المدير",
                                          amount: order.amount,
                                        }),
                                      }).then(() => {
                                        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
                                      });
                                    }}
                                  >
                                    <CheckCircle2 className="me-2 h-3.5 w-3.5" />
                                    {tAuto('auto.requestApproval')}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Order Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{tAuto('auto.purchaseOrder')}</span>
                  <span className="font-mono text-sm text-teal-600 dark:text-teal-400">#{viewOrder.number}</span>
                  {isHighValue(viewOrder.amount) && (
                    <Badge variant="secondary" className="text-[9px] h-4 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-0">
                      {tAuto('auto.highValue')}
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500">{tAuto('auto.supplier')}</span>
                    <p className="font-medium text-slate-900 dark:text-white">{viewOrder.supplier.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">{tAuto('auto.project')}</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {viewOrder.project ? (ar ? viewOrder.project.name : viewOrder.project.nameEn || viewOrder.project.name) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">{tAuto('auto.status1')}</span>
                    <div className="mt-1">
                      <Badge variant="secondary" className={`text-[10px] h-5 flex items-center gap-1 ${statusConfig[viewOrder.status]?.color || ""}`}>
                        <StatusIcon status={viewOrder.status} className="h-3 w-3" />
                        {ar ? statusConfig[viewOrder.status]?.ar : statusConfig[viewOrder.status]?.en}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">{tAuto('auto.date')}</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {new Date(viewOrder.createdAt).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                    </p>
                  </div>
                </div>

                {/* Line Items */}
                {viewOrder.items.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">{tAuto('auto.items1')}</span>
                    <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">{tAuto('auto.item')}</TableHead>
                            <TableHead className="text-xs text-center">{tAuto('auto.qty')}</TableHead>
                            <TableHead className="text-xs text-end">{tAuto('auto.price')}</TableHead>
                            <TableHead className="text-xs text-end">{tAuto('auto.total')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewOrder.items.map((item, i) => (
                            <TableRow key={item.id || i}>
                              <TableCell className="text-sm">{item.itemName}</TableCell>
                              <TableCell className="text-sm text-center tabular-nums">{item.quantity}</TableCell>
                              <TableCell className="text-sm text-end tabular-nums font-mono">{formatCurrency(item.unitPrice, ar)}</TableCell>
                              <TableCell className="text-sm text-end tabular-nums font-medium font-mono">{formatCurrency(item.total, ar)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-l from-teal-50 to-sky-50 dark:from-teal-950/20 dark:to-sky-950/20">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tAuto('auto.totalAmount')}</span>
                  <span className="text-lg font-bold text-teal-700 dark:text-teal-300 tabular-nums font-mono">
                    {formatCurrency(viewOrder.amount, ar)}
                  </span>
                </div>

                {/* Action Buttons */}
                {(viewOrder.status === "SUBMITTED" || viewOrder.status === "APPROVED") && (
                  <div className="flex gap-2">
                    {viewOrder.status === "SUBMITTED" && (
                      <>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateStatusMutation.mutate({ id: viewOrder.id, status: "APPROVED" })}
                        >
                          <CheckCircle className="h-4 w-4 me-1" />
                          {tAuto('auto.approve')}
                        </Button>
                        <Button
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => updateStatusMutation.mutate({ id: viewOrder.id, status: "CANCELLED" })}
                        >
                          <XCircle className="h-4 w-4 me-1" />
                          {tAuto('auto.reject')}
                        </Button>
                      </>
                    )}
                    {viewOrder.status === "APPROVED" && (
                      <Button
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => updateStatusMutation.mutate({ id: viewOrder.id, status: "RECEIVED" })}
                      >
                        <CheckCircle className="h-4 w-4 me-1" />
                        {tAuto('auto.markAsReceived')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editOrder}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditOrder(null); setFormData(emptyForm); }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editOrder ? (tAuto('auto.editPurchaseOrder')) : (tAuto('auto.newPurchaseOrder'))}
            </DialogTitle>
            <DialogDescription>
              {editOrder
                ? (tAuto('auto.editPurchaseOrderDetails'))
                : (tAuto('auto.createANewPurchaseOrder'))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.pONumber')} *</Label>
                <Input
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder={tAuto('auto.pO2024001')}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.supplier')} *</Label>
                <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={tAuto('auto.selectSupplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.project')} ({tAuto('auto.optional1')})</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={tAuto('auto.noProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tAuto('auto.noProject')}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.number} — {ar ? p.name : p.nameEn || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.status1')}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{ar ? cfg.ar : cfg.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{tAuto('auto.lineItems')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={addLineItem}
                >
                  <Plus className="h-3 w-3 me-1" />
                  {tAuto('auto.addItem1')}
                </Button>
              </div>

              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[1fr,80px,100px,100px,32px] gap-2 text-[10px] text-slate-500 px-1">
                  <span>{tAuto('auto.itemName')}</span>
                  <span className="text-center">{tAuto('auto.qty')}</span>
                  <span className="text-end">{tAuto('auto.price')}</span>
                  <span className="text-end">{tAuto('auto.total')}</span>
                  <span></span>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr,80px,100px,100px,32px] gap-2 items-center">
                    <Input
                      value={item.itemName}
                      onChange={(e) => updateLineItem(index, "itemName", e.target.value)}
                      placeholder={tAuto('auto.itemName1')}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                      className="h-8 text-xs text-center tabular-nums"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)}
                      className="h-8 text-xs text-end tabular-nums"
                      placeholder="0"
                    />
                    <div className="text-xs text-end font-medium tabular-nums text-slate-700 dark:text-slate-300 h-8 flex items-center justify-end font-mono">
                      {formatCurrency(parseFloat(item.total) || 0, ar)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-500"
                      onClick={() => formData.items.length > 1 && removeLineItem(index)}
                      disabled={formData.items.length <= 1}
                      aria-label={tAuto('auto.removeItem')}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-l from-teal-50 to-sky-50 dark:from-teal-950/20 dark:to-sky-950/20">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tAuto('auto.totalAmount')}</span>
              <span className="text-lg font-bold text-teal-700 dark:text-teal-300 tabular-nums font-mono">
                {formatCurrency(parseFloat(formData.amount) || 0, ar)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAddDialog(false); setEditOrder(null); setFormData(emptyForm); }}
            >
              {tAuto('auto.cancel')}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSave}
              disabled={!formData.number || !formData.supplierId || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? (tAuto('auto.saving'))
                : (tAuto('auto.save'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
