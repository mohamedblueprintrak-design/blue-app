"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Building2, Trash2, RefreshCw, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useLang } from "@/hooks/use-lang";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";

interface BankAccount {
  id: string;
  name: string;
  nameAr: string | null;
  bankName: string;
  iban: string | null;
  accountNumber: string | null;
  currency: string;
  currentBalance: string | number;
  isActive: boolean;
  createdAt: string;
}

export default function FinanceBankAccountsPage() {
  const tAuto = useTranslations();
  const lang = useLang();
  const ar = lang === "ar";
  const toast = useToastFeedback({ ar });
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    bankName: "",
    iban: "",
    accountNumber: "",
    openingBalance: 0,
    currency: "AED",
  });

  const { data: accounts, isLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/bank-accounts");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/finance/bank-accounts", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setShowAddDialog(false);
      toast.showSuccess(ar ? "تم إنشاء الحساب البنكي" : "Bank account created");
      setFormData({ name: "", bankName: "", iban: "", accountNumber: "", openingBalance: 0, currency: "AED" });
    },
    onError: (error: Error) => {
      toast.showError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finance/bank-accounts/${id}`, {
        method: "DELETE",
        headers: getMutationHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.showSuccess(ar ? "تم إلغاء تفعيل الحساب" : "Account deactivated");
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
            <Building2 className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {tAuto('auto.bankAccounts')}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {ar ? "إدارة الحسابات البنكية والتسوية" : "Manage bank accounts and reconciliation"}
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-1 bg-brand-navy-600 hover:bg-brand-navy-700" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-3.5 w-3.5" />
          {ar ? "حساب جديد" : "Add Account"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{ar ? "إجمالي الرصيد" : "Total Balance"}</p>
              <p className="text-lg font-bold text-slate-900 dark:white">
                {formatCurrency(accounts?.reduce((s, a) => s + Number(a.currentBalance), 0) || 0, ar)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{ar ? "عدد الحسابات" : "Accounts"}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{accounts?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{ar ? "تسوية" : "Reconciliation"}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "قريباً" : "Soon"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Table */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{ar ? "الحسابات البنكية" : "Bank Accounts"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
              {ar ? "لا توجد حسابات بنكية. أضف حساباً للبدء." : "No bank accounts yet. Add one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{ar ? "اسم الحساب" : "Account Name"}</TableHead>
                  <TableHead className="text-xs">{ar ? "البنك" : "Bank"}</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">{ar ? "IBAN" : "IBAN"}</TableHead>
                  <TableHead className="text-xs text-end">{ar ? "الرصيد" : "Balance"}</TableHead>
                  <TableHead className="text-xs text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="text-xs font-medium">{ar && acc.nameAr ? acc.nameAr : acc.name}</TableCell>
                    <TableCell className="text-xs text-slate-500">{acc.bankName}</TableCell>
                    <TableCell className="text-xs text-slate-500 hidden sm:table-cell font-mono">
                      {acc.iban ? `****${acc.iban.slice(-4)}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-end font-mono font-semibold">
                      {formatCurrency(Number(acc.currentBalance), ar)} {acc.currency}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                        onClick={() => deleteMutation.mutate(acc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{ar ? "إضافة حساب بنكي" : "Add Bank Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{ar ? "اسم الحساب" : "Account Name"}</Label>
              <Input
                className="h-8 text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={ar ? "مثال: حساب ADCB الجاري" : "e.g. ADCB Current"}
              />
            </div>
            <div>
              <Label className="text-xs">{ar ? "اسم البنك" : "Bank Name"}</Label>
              <Input
                className="h-8 text-sm"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="ADCB, Emirates NBD..."
              />
            </div>
            <div>
              <Label className="text-xs">IBAN</Label>
              <Input
                className="h-8 text-sm font-mono"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="AE070331234567890123456"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{ar ? "رقم الحساب" : "Account No."}</Label>
                <Input
                  className="h-8 text-sm font-mono"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="****1234"
                />
              </div>
              <div>
                <Label className="text-xs">{ar ? "الرصيد الافتتاحي" : "Opening Balance"}</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(false)}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              size="sm"
              className="bg-brand-navy-600 hover:bg-brand-navy-700"
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || !formData.bankName}
            >
              {ar ? "إنشاء" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
