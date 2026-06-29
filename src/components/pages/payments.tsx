"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Plus, Search, CheckCircle, XCircle, CreditCard, Banknote, Building2, Wifi, Wallet, Clock, BadgeCheck } from 'lucide-react'

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Types =====
interface PaymentItem {
  id: string;
  voucherNumber: string;
  amount: number;
  payMethod: string;
  beneficiary: string;
  referenceNumber: string;
  status: string;
  description: string;
  projectId: string | null;
  createdAt: string;
  approver: { id: string; name: string } | null;
  project: { id: string; name: string; nameEn: string; number: string } | null;
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
    PENDING: { ar: "معلّق", en: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    APPROVED: { ar: "معتمد", en: "Approved", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" },
    COMPLETED: { ar: "مكتمل", en: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    CANCELLED: { ar: "ملغي", en: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  };
  return configs[status] || configs.PENDING;
}

function getMethodConfig(method: string) {
  const configs: Record<string, { ar: string; en: string; icon: typeof Banknote }> = {
    CASH: { ar: "نقدي", en: "Cash", icon: Banknote },
    CHEQUE: { ar: "شيك", en: "Cheque", icon: CreditCard },
    TRANSFER: { ar: "تحويل بنكي", en: "Transfer", icon: Building2 },
    ONLINE: { ar: "دفع إلكتروني", en: "Online", icon: Wifi },
  };
  return configs[method] || configs.TRANSFER;
}

// ===== Payment Timeline Component =====
function PaymentTimeline({ payments, ar }: { payments: PaymentItem[]; ar: boolean }) {
  const tAuto = useTranslations();
  const now = new Date();
  const months: { key: string; label: string; amount: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short" });
    months.push({ key, label, amount: 0 });
  }

  payments.forEach((p) => {
    if (p.status === "COMPLETED") {
      const pDate = new Date(p.createdAt);
      const pKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
      const month = months.find((m) => m.key === pKey);
      if (month) month.amount += p.amount;
    }
  });

  const maxAmount = Math.max(...months.map((m) => m.amount), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tAuto('auto.monthlyPayments6Months')}
        </p>
        <p className="text-[10px] text-slate-400">{tAuto('auto.completedOnly')}</p>
      </div>
      <div className="flex items-end gap-2 h-20">
        {months.map((m) => {
          const height = maxAmount > 0 ? Math.max((m.amount / maxAmount) * 100, 4) : 4;
          return (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative group">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-brand-navy-600 to-brand-navy-400 transition-all duration-500 min-h-[4px]"
                  style={{ height: `${height}%` }}
                />
                {m.amount > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                    {m.amount >= 1000 ? `${(m.amount / 1000).toFixed(0)}K` : m.amount}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400">{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Main Component =====
interface PaymentsPageProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function PaymentsPage({ language, projectId }: PaymentsPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);

  const emptyForm = {
    voucherNumber: "", projectId: projectId || "", amount: "",
    payMethod: "TRANSFER", beneficiary: "", referenceNumber: "", description: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery<PaymentItem[]>({
    queryKey: ["payments", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/payments${projectId ? `?projectId=${projectId}` : ''}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data || json.payments || json;
    },
  });

  // Fetch projects
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
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", projectId] });
      setShowDialog(false);
      setFormData(emptyForm);
    },
  });

  // Approve/Reject mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/payments/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", projectId] });
    },
  });

  // Filter
  const filtered = payments.filter((p) => {
    const matchSearch =
      p.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.beneficiary.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.project && (ar ? p.project.name : p.project.nameEn || p.project.name).toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Summary
  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount), 0);
  const pendingCount = filtered.filter((p) => p.status === "PENDING").length;
  const approvedThisMonth = filtered.filter((p) => {
    if (p.status !== "APPROVED") return false;
    const now = new Date();
    const pDate = new Date(p.createdAt);
    return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
  }).length;
  const completedAmount = filtered.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + Number(p.amount), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="py-0 gap-0"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
            <Wallet className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.payments')}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {payments.length} {tAuto('auto.payments1')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tAuto('auto.search1')} className="ps-9 h-8 text-sm rounded-lg" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
              <SelectItem value="PENDING">{tAuto('auto.pending')}</SelectItem>
              <SelectItem value="APPROVED">{tAuto('auto.approved')}</SelectItem>
              <SelectItem value="COMPLETED">{tAuto('auto.completed')}</SelectItem>
              <SelectItem value="CANCELLED">{tAuto('auto.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20" onClick={() => { setFormData(emptyForm); setShowDialog(true); }}>
            <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newPayment')}
          </Button>
        </div>
      </div>

      {/* Summary Cards with Gradient Backgrounds */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Payments */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-brand-navy-500 to-cyan-600 dark:from-brand-navy-600 dark:to-cyan-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Wallet className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-brand-navy-100">{tAuto('auto.totalPayments')}</span>
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums">{formatCurrency(totalAmount, ar)}</div>
            <p className="text-[10px] text-white/60 mt-1">{filtered.length} {tAuto('auto.payments1')}</p>
          </div>
        </Card>

        {/* Pending Approval */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Clock className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-amber-100">{tAuto('auto.pendingApproval')}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{pendingCount}</div>
            <p className="text-[10px] text-white/60 mt-1">
              {formatCurrency(filtered.filter((p) => p.status === "PENDING").reduce((s, p) => s + Number(p.amount), 0), ar)}
            </p>
          </div>
        </Card>

        {/* Approved This Month */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><BadgeCheck className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-emerald-100">{tAuto('auto.approvedThisMonth')}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{approvedThisMonth}</div>
            <p className="text-[10px] text-white/60 mt-1">
              {formatCurrency(filtered.filter((p) => {
                if (p.status !== "APPROVED") return false;
                const now = new Date();
                const pDate = new Date(p.createdAt);
                return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
              }).reduce((s, p) => s + Number(p.amount), 0), ar)}
            </p>
          </div>
        </Card>

        {/* Total Amount Completed */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><CheckCircle className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-violet-100">{tAuto('auto.completedAED')}</span>
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums">{formatCurrency(completedAmount, ar)}</div>
            <p className="text-[10px] text-white/60 mt-1">
              {filtered.filter((p) => p.status === "COMPLETED").length} {tAuto('auto.payments1')}
            </p>
          </div>
        </Card>
      </div>

      {/* Payment Timeline Mini-Chart */}
      <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm">
        <CardContent className="p-4">
          <PaymentTimeline payments={filtered} ar={ar} />
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <ScrollArea className="max-h-[calc(100vh-460px)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold">{tAuto('auto.voucher1')}</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">{tAuto('auto.project')}</TableHead>
                <TableHead className="text-xs font-semibold text-end">{tAuto('auto.amount')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.method')}</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">{tAuto('auto.beneficiary')}</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">{tAuto('auto.reference')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{tAuto('auto.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment, idx) => {
                const sc = getStatusConfig(payment.status);
                const mc = getMethodConfig(payment.payMethod);
                const MethodIcon = mc.icon;
                return (
                  <TableRow
                    key={payment.id}
                    className={cn(
                      "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      idx % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/50 dark:bg-slate-800/20"
                    )}
                  >
                    <TableCell className="font-mono text-xs text-slate-500">{payment.voucherNumber || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-500">{payment.project ? (ar ? payment.project.name : payment.project.nameEn || payment.project.name) : "—"}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-white text-end font-mono tabular-nums">{formatCurrency(payment.amount, ar)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MethodIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs">{ar ? mc.ar : mc.en}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-slate-600 dark:text-slate-300 max-w-[150px] truncate">{payment.beneficiary || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs text-slate-500">{payment.referenceNumber || "—"}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                        {ar ? sc.ar : sc.en}
                      </span>
                    </TableCell>
                    <TableCell className="text-start">
                      <div className="flex items-center gap-1">
                        {payment.status === "PENDING" && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30" onClick={() => statusMutation.mutate({ id: payment.id, status: "APPROVED" })}>
                              <CheckCircle className="h-3.5 w-3.5 me-1" />{tAuto('auto.approve')}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => statusMutation.mutate({ id: payment.id, status: "CANCELLED" })}>
                              <XCircle className="h-3.5 w-3.5 me-1" />{tAuto('auto.reject')}
                            </Button>
                          </>
                        )}
                        {payment.status === "APPROVED" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700" onClick={() => statusMutation.mutate({ id: payment.id, status: "COMPLETED" })}>
                            <CheckCircle className="h-3.5 w-3.5 me-1" />{tAuto('auto.complete')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    {tAuto('auto.noPaymentsFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setFormData(emptyForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tAuto('auto.newPayment')}</DialogTitle>
            <DialogDescription>{tAuto('auto.addANewPayment')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{tAuto('auto.voucher1')}</Label>
                <Input value={formData.voucherNumber} onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })} placeholder="PAY-001" className="h-8 text-sm rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{tAuto('auto.project')}</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={tAuto('auto.selectProject')} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{tAuto('auto.amountAED')} *</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0" className="h-8 text-sm tabular-nums font-mono rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{tAuto('auto.paymentMethod')} *</Label>
                <Select value={formData.payMethod} onValueChange={(v) => setFormData({ ...formData, payMethod: v })}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{tAuto('auto.cash')}</SelectItem>
                    <SelectItem value="CHEQUE">{tAuto('auto.cheque')}</SelectItem>
                    <SelectItem value="TRANSFER">{tAuto('auto.bankTransfer')}</SelectItem>
                    <SelectItem value="ONLINE">{tAuto('auto.onlinePayment')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.beneficiary')}</Label>
              <Input value={formData.beneficiary} onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })} placeholder={tAuto('auto.beneficiaryName')} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.reference1')}</Label>
              <Input value={formData.referenceNumber} onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })} placeholder={tAuto('auto.referenceNumber')} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.description')}</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={tAuto('auto.paymentDescription')} className="text-sm min-h-[60px] rounded-lg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setFormData(emptyForm); }}>{tAuto('auto.cancel')}</Button>
            <Button className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white" onClick={() => createMutation.mutate(formData)} disabled={!formData.amount || createMutation.isPending}>
              {createMutation.isPending ? (tAuto('auto.saving')) : (tAuto('auto.save'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
