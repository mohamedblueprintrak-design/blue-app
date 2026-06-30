/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-lang";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

export default function FinanceJournalEntriesPage() {
  const { t, isAr } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<any[]>([
    { accountId: "", debit: 0, credit: 0 },
    { accountId: "", debit: 0, credit: 0 },
  ]);

  // 1. Fetch Accounts (for the dropdown selection)
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ["finance", "accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const json = await res.json();
      return json.data;
    },
  });

  // 2. Fetch Journal Entries (list)
  // Since we query ledger lines, wait: `/api/finance/ledger` returns ledger lines grouped by journal entry.
  // Querying General Ledger is actually the transaction list.
  const { data: ledgerLines = [], isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["finance", "ledger", search],
    queryFn: async () => {
      const res = await fetch(`/api/finance/ledger`);
      if (!res.ok) throw new Error("Failed to fetch ledger");
      const json = await res.json();
      return json.data;
    },
  });

  // Group ledger lines by Journal Entry ID
  const entriesMap = new Map<string, { entry: any; lines: any[] }>();
  for (const line of ledgerLines) {
    const entryId = line.journalEntryId;
    const existing = entriesMap.get(entryId) || {
      entry: line.journalEntry,
      lines: [],
    };
    existing.lines.push({
      id: line.id,
      account: line.account,
      debit: Number(line.debit),
      credit: Number(line.credit),
    });
    entriesMap.set(entryId, existing);
  }
  const journalEntries = Array.from(entriesMap.values()).reverse();

  // 3. Create Journal Entry Mutation
  const createMutation = useMutation({
    mutationFn: async (newEntry: unknown) => {
      const res = await fetch("/api/finance/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to post entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "ledger"] });
      toast.success(t("تم ترحيل القيد بنجاح", "Journal entry posted successfully"));
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || t("حدث خطأ ما", "Something went wrong"));
    },
  });

  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setReference("");
    setLines([
      { accountId: "", debit: 0, credit: 0 },
      { accountId: "", debit: 0, credit: 0 },
    ]);
  };

  // Add a line to the transaction form
  const addLine = () => {
    setLines([...lines, { accountId: "", debit: 0, credit: 0 }]);
  };

  // Delete a line from the form
  const deleteLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error(t("الحد الأدنى لأسطر القيد هو سطرين", "Journal entry must have at least 2 lines"));
      return;
    }
    setLines(lines.filter((_, idx) => idx !== index));
  };

  // Update line details
  const updateLine = (index: number, field: string, value: unknown) => {
    const updated = [...lines];
    if (field === "accountId") {
      updated[index].accountId = value;
    } else if (field === "debit") {
      updated[index].debit = Math.max(0, Number(value));
      if (updated[index].debit > 0) updated[index].credit = 0; // mutually exclusive
    } else if (field === "credit") {
      updated[index].credit = Math.max(0, Number(value));
      if (updated[index].credit > 0) updated[index].debit = 0;
    }
    setLines(updated);
  };

  // Totals calculations
  const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0);
  const diff = Math.abs(totalDebits - totalCredits);
  const isBalanced = diff < 0.001 && totalDebits > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      toast.error(t("الرجاء إدخال الوصف الرئيسي", "Please enter description"));
      return;
    }
    if (lines.some((l) => !l.accountId)) {
      toast.error(t("الرجاء اختيار الحسابات لجميع الأسطر", "Please select accounts for all lines"));
      return;
    }
    if (!isBalanced) {
      toast.error(t("القيد غير متوازن، يرجى التحقق من القيم", "Journal entry is not balanced"));
      return;
    }

    createMutation.mutate({
      date: new Date(date),
      reference: reference || undefined,
      description,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
      })),
    });
  };

  // Search Filter
  const filteredEntries = journalEntries.filter(({ entry, lines: eLines }) => {
    const matchesHeader =
      entry.description.toLowerCase().includes(search.toLowerCase()) ||
      (entry.reference && entry.reference.toLowerCase().includes(search.toLowerCase()));
    
    const matchesLines = eLines.some(
      (l) =>
        l.account.code.includes(search) ||
        l.account.nameAr.includes(search) ||
        l.account.nameEn.toLowerCase().includes(search.toLowerCase())
    );

    return matchesHeader || matchesLines;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-navy-600 dark:text-navy-400" />
            {t("قيود اليومية العامة", "General Journal Entries")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("تسجيل وترحيل قيود اليومية المزدوجة وتتبع المعاملات", "Record and post double-entry journal vouchers and transactions")}
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-navy-600 hover:bg-navy-700 text-white flex items-center gap-1.5 ms-auto sm:ms-0">
                <Plus className="h-4 w-4" />
                {t("إنشاء قيد جديد", "New Journal Voucher")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{t("إنشاء قيد يومية مزدوج", "Create Journal Entry Voucher")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {/* Header Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="date" className="required">{t("تاريخ القيد", "Voucher Date")}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reference">{t("المرجع / الرقم", "Reference / Invoice #")}</Label>
                    <Input
                      id="reference"
                      placeholder="e.g. REC-2026-004"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="required">{t("الوصف الرئيسي", "Main Description")}</Label>
                    <Input
                      id="description"
                      placeholder={t("مثال: إثبات سداد إيجار المكتب", "e.g. Office Rent Payment")}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Journal lines Dynamic Table */}
                <div className="space-y-2 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead>{t("الحساب المالي", "Ledger Account")}</TableHead>
                        <TableHead className="w-32">{t("مدين (Debit)", "Debit")}</TableHead>
                        <TableHead className="w-32">{t("دائن (Credit)", "Credit")}</TableHead>
                        <TableHead className="w-12 text-center"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                          <TableCell>
                            <Select
                              value={line.accountId}
                              onValueChange={(val) => updateLine(index, "accountId", val)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("اختر الحساب...", "Select Account...")} />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-900 max-h-56">
                                {accounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.code} - {isAr ? acc.nameAr : acc.nameEn}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={line.debit || ""}
                              placeholder="0.00"
                              onChange={(e) => updateLine(index, "debit", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={line.credit || ""}
                              placeholder="0.00"
                              onChange={(e) => updateLine(index, "credit", e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteLine(index)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center">
                  <Button type="button" variant="outline" size="sm" onClick={addLine} className="flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    {t("إضافة سطر", "Add Line")}
                  </Button>

                  {/* Balancing Check Panel */}
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <div className="flex gap-4">
                      <span>{t("إجمالي المدين:", "Total Debits:")} <strong className="font-mono">{formatCurrency(totalDebits, isAr)}</strong></span>
                      <span>{t("إجمالي الدائن:", "Total Credits:")} <strong className="font-mono">{formatCurrency(totalCredits, isAr)}</strong></span>
                    </div>

                    {isBalanced ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("القيد متوازن وجاهز للترحيل", "Balanced and ready to post")}
                      </span>
                    ) : totalDebits > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t("القيد غير متوازن بالفارق:", "Unbalanced. Difference:")} {formatCurrency(diff, isAr)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t pt-3 mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    {t("إلغاء", "Cancel")}
                  </Button>
                  <Button type="submit" disabled={!isBalanced || createMutation.isPending} className="bg-navy-600 hover:bg-navy-700 text-white">
                    {createMutation.isPending ? t("جاري الترحيل...", "Posting...") : t("ترحيل القيد", "Post Voucher")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder={t("بحث باسم الحساب، الوصف، أو المرجع...", "Search by account, description, ref...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Entries List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <AlertTriangle className="h-8 w-8 mx-auto text-slate-400" />
            <p className="font-medium">{t("لا توجد قيود مسجلة بعد", "No journal entries found")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map(({ entry, lines: eLines }) => {
            const dateStr = new Date(entry.date).toLocaleDateString(isAr ? "ar-AE" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const voucherTotal = eLines.reduce((sum, l) => sum + l.debit, 0);

            return (
              <Card key={entry.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden">
                {/* Entry Header */}
                <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-2 sm:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{entry.description}</span>
                      {entry.reference && <Badge variant="outline" className="font-mono text-xs">{entry.reference}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateStr}</span>
                      <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> ID: <span className="font-mono">{entry.id.slice(-6)}</span></span>
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="text-xs text-slate-400">{t("إجمالي القيد", "Total Amount")}</span>
                    <p className="text-sm font-bold text-navy-600 dark:text-navy-400 font-mono">{formatCurrency(voucherTotal, isAr)}</p>
                  </div>
                </div>

                {/* Entry lines */}
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/20 dark:bg-slate-800/10 border-b-0">
                      <TableRow>
                        <TableHead className="ps-6">{t("كود الحساب", "Account Code")}</TableHead>
                        <TableHead>{t("الحساب المالي", "Ledger Account")}</TableHead>
                        <TableHead>{t("النوع", "Type")}</TableHead>
                        <TableHead className="w-32 text-end">{t("مدين (Debit)", "Debit")}</TableHead>
                        <TableHead className="w-32 text-end pe-6">{t("دائن (Credit)", "Credit")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eLines.map((line) => (
                        <TableRow key={line.id} className="hover:bg-slate-50/10 dark:hover:bg-slate-800/5 border-b-0">
                          <TableCell className="font-mono ps-6">{line.account.code}</TableCell>
                          <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                            {isAr ? line.account.nameAr : line.account.nameEn}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {line.account.type === "ASSET" && t("أصول", "Asset")}
                            {line.account.type === "LIABILITY" && t("التزامات", "Liability")}
                            {line.account.type === "EQUITY" && t("حقوق ملكية", "Equity")}
                            {line.account.type === "REVENUE" && t("إيرادات", "Revenue")}
                            {line.account.type === "EXPENSE" && t("مصروفات", "Expense")}
                          </TableCell>
                          <TableCell className="text-end font-mono text-slate-800 dark:text-slate-200">
                            {line.debit > 0 ? formatCurrency(line.debit, isAr) : "-"}
                          </TableCell>
                          <TableCell className="text-end font-mono text-slate-800 dark:text-slate-200 pe-6">
                            {line.credit > 0 ? formatCurrency(line.credit, isAr) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
