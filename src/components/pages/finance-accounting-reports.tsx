/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-lang";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileSpreadsheet, 
  BookOpen, 
  Scale, 
  TrendingUp, 
  Building,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileDown
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function FinanceAccountingReportsPage() {
  const { t, isAr } = useLanguage();
  const [activeTab, setActiveTab] = useState("ledger");

  // Filters state
  const [ledgerAccountId, setLedgerAccountId] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [balanceSheetDate, setBalanceSheetDate] = useState("");

  // 1. Fetch Accounts (for filter dropdowns)
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ["finance", "accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const json = await res.json();
      return json.data;
    },
  });

  // 2. Fetch General Ledger
  const { data: ledgerLines = [], isLoading: isLoadingLedger, refetch: refetchLedger } = useQuery<any[]>({
    queryKey: ["finance", "reports", "ledger", ledgerAccountId, startDate, endDate],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (ledgerAccountId !== "ALL") queryParams.append("accountId", ledgerAccountId);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      const res = await fetch(`/api/finance/ledger?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch ledger");
      const json = await res.json();
      return json.data;
    },
  });

  // 3. Fetch Trial Balance
  const { data: trialBalance, isLoading: isLoadingTB, refetch: refetchTB } = useQuery<any>({
    queryKey: ["finance", "reports", "trial-balance"],
    queryFn: async () => {
      const res = await fetch("/api/finance/trial-balance");
      if (!res.ok) throw new Error("Failed to fetch trial balance");
      const json = await res.json();
      return json.data;
    },
  });

  // 4. Fetch Income Statement (P&L)
  const { data: incomeStatement, isLoading: isLoadingIS, refetch: refetchIS } = useQuery<any>({
    queryKey: ["finance", "reports", "income-statement", startDate, endDate],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      const res = await fetch(`/api/finance/income-statement?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch income statement");
      const json = await res.json();
      return json.data;
    },
  });

  // 5. Fetch Balance Sheet
  const { data: balanceSheet, isLoading: isLoadingBS, refetch: refetchBS } = useQuery<any>({
    queryKey: ["finance", "reports", "balance-sheet", balanceSheetDate],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (balanceSheetDate) queryParams.append("date", balanceSheetDate);
      const res = await fetch(`/api/finance/balance-sheet?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch balance sheet");
      const json = await res.json();
      return json.data;
    },
  });

  const handleRefetch = () => {
    if (activeTab === "ledger") refetchLedger();
    if (activeTab === "trial-balance") refetchTB();
    if (activeTab === "income-statement") refetchIS();
    if (activeTab === "balance-sheet") refetchBS();
  };

  const getAccountName = (acc: any) => (isAr ? acc.nameAr : acc.nameEn);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-navy-600 dark:text-navy-400" />
            {t("التقارير المالية والمحاسبية", "Financial & Accounting Reports")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("قوائم الدخل والميزانية وموازين المراجعة التفصيلية للنظام", "Trial Balance, General Ledger, Profit & Loss, and Balance Sheet statements")}
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={handleRefetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="flex items-center gap-1.5 ms-auto sm:ms-0">
            <FileDown className="h-4 w-4" />
            {t("تصدير التقرير", "Export Report")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto h-auto flex gap-1">
          <TabsTrigger value="ledger" className="rounded-lg py-2 flex items-center gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-4 w-4" />
            {t("دفتر الأستاذ", "General Ledger")}
          </TabsTrigger>
          <TabsTrigger value="trial-balance" className="rounded-lg py-2 flex items-center gap-1.5 text-xs sm:text-sm">
            <Scale className="h-4 w-4" />
            {t("ميزان المراجعة", "Trial Balance")}
          </TabsTrigger>
          <TabsTrigger value="income-statement" className="rounded-lg py-2 flex items-center gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            {t("قائمة الدخل P&L", "Profit & Loss")}
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="rounded-lg py-2 flex items-center gap-1.5 text-xs sm:text-sm">
            <Building className="h-4 w-4" />
            {t("الميزانية العمومية", "Balance Sheet")}
          </TabsTrigger>
        </TabsList>

        {/* 1. General Ledger Tab */}
        <TabsContent value="ledger">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-navy-600 dark:text-navy-400" />
                  {t("كشف تفصيلي لحركات الحسابات", "Detailed Transaction History")}
                </CardTitle>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <div className="w-full sm:w-56 space-y-1">
                    <Label className="text-xs text-slate-400">{t("الحساب المالي", "Ledger Account")}</Label>
                    <Select value={ledgerAccountId} onValueChange={setLedgerAccountId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 max-h-56">
                        <SelectItem value="ALL">{t("جميع الحسابات", "All Accounts")}</SelectItem>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code} - {getAccountName(acc)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-1/2 sm:w-36 space-y-1">
                    <Label className="text-xs text-slate-400">{t("من تاريخ", "From Date")}</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>

                  <div className="w-1/2 sm:w-36 space-y-1">
                    <Label className="text-xs text-slate-400">{t("إلى تاريخ", "To Date")}</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingLedger ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : ledgerLines.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <AlertCircle className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p>{t("لا توجد حركات مسجلة تطابق الفلاتر المحددة", "No transactions found matching search criteria")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead className="w-28">{t("التاريخ", "Date")}</TableHead>
                        <TableHead>{t("القيد المحاسبي", "Journal Description")}</TableHead>
                        <TableHead className="w-28">{t("المرجع", "Ref")}</TableHead>
                        <TableHead>{t("الحساب", "Account")}</TableHead>
                        <TableHead className="w-32 text-end">{t("مدين", "Debit")}</TableHead>
                        <TableHead className="w-32 text-end">{t("دائن", "Credit")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerLines.map((line) => {
                        const d = new Date(line.journalEntry.date).toLocaleDateString(isAr ? "ar-AE" : "en-US");
                        return (
                          <TableRow key={line.id}>
                            <TableCell className="text-slate-500 dark:text-slate-400">{d}</TableCell>
                            <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                              {line.journalEntry.description}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{line.journalEntry.reference || "-"}</TableCell>
                            <TableCell className="font-medium text-navy-600 dark:text-navy-400 text-xs">
                              {line.account.code} - {getAccountName(line.account)}
                            </TableCell>
                            <TableCell className="text-end font-mono">
                              {Number(line.debit) > 0 ? formatCurrency(Number(line.debit), isAr) : "-"}
                            </TableCell>
                            <TableCell className="text-end font-mono">
                              {Number(line.credit) > 0 ? formatCurrency(Number(line.credit), isAr) : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Trial Balance Tab */}
        <TabsContent value="trial-balance">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-row">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Scale className="h-5 w-5 text-navy-600 dark:text-navy-400" />
                {t("أرصدة الحسابات وميزان التوازن", "Trial Balance Sheets")}
              </CardTitle>

              {trialBalance && (
                <div>
                  {trialBalance.balancesMatch ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("ميزان المراجعة متوازن", "Trial Balance is Balanced")}
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {t("ميزان المراجعة غير متوازن", "Out of Balance")}
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingTB ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !trialBalance || trialBalance.rows.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>{t("لا توجد بيانات حسابات مسجلة لتوليد ميزان المراجعة", "No accounts data registered to generate Trial Balance")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead>{t("الكود", "Code")}</TableHead>
                        <TableHead>{t("اسم الحساب المالي", "Account Name")}</TableHead>
                        <TableHead>{t("النوع", "Type")}</TableHead>
                        <TableHead className="w-32 text-end">{t("حركات مدين", "Debit Activity")}</TableHead>
                        <TableHead className="w-32 text-end">{t("حركات دائن", "Credit Activity")}</TableHead>
                        <TableHead className="w-32 text-end">{t("الرصيد النهائي", "Net Balance")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.rows.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono font-bold">{row.code}</TableCell>
                          <TableCell className="font-medium text-slate-800 dark:text-slate-200">{getAccountName(row)}</TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {row.type === "ASSET" && t("أصول", "Asset")}
                            {row.type === "LIABILITY" && t("التزامات", "Liability")}
                            {row.type === "EQUITY" && t("حقوق ملكية", "Equity")}
                            {row.type === "REVENUE" && t("إيرادات", "Revenue")}
                            {row.type === "EXPENSE" && t("مصروفات", "Expense")}
                          </TableCell>
                          <TableCell className="text-end font-mono">{formatCurrency(row.totalDebit, isAr)}</TableCell>
                          <TableCell className="text-end font-mono">{formatCurrency(row.totalCredit, isAr)}</TableCell>
                          <TableCell className="text-end font-mono font-bold text-navy-600 dark:text-navy-400">
                            {formatCurrency(row.netBalance, isAr)}
                            <span className="text-[10px] text-slate-400 ms-1">
                              {row.isDebitNormal ? "Dr" : "Cr"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Summary Row */}
                      <TableRow className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2">
                        <TableCell colSpan={3} className="ps-6 font-bold text-slate-900 dark:text-slate-100">
                          {t("الإجمالي العام للقيم والأرصدة", "Grand Totals")}
                        </TableCell>
                        <TableCell className="text-end font-mono text-slate-900 dark:text-slate-100">
                          {formatCurrency(trialBalance.totalDebitSum, isAr)}
                        </TableCell>
                        <TableCell className="text-end font-mono text-slate-900 dark:text-slate-100">
                          {formatCurrency(trialBalance.totalCreditSum, isAr)}
                        </TableCell>
                        <TableCell className="text-end font-mono text-slate-900 dark:text-slate-100">
                          -
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Income Statement Tab */}
        <TabsContent value="income-statement">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-navy-600 dark:text-navy-400" />
                  {t("قائمة الأرباح والخسائر (Income Statement)", "Profit & Loss (Income Statement)")}
                </CardTitle>

                {/* Date range */}
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="w-1/2 space-y-1">
                    <Label className="text-xs text-slate-400">{t("من تاريخ", "From Date")}</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="w-1/2 space-y-1">
                    <Label className="text-xs text-slate-400">{t("إلى تاريخ", "To Date")}</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {isLoadingIS ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !incomeStatement ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>{t("لا توجد معاملات محاسبية لعرض قائمة الدخل", "No transactions found to generate Income Statement")}</p>
                </div>
              ) : (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Revenue Section */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 border-b pb-1">
                      {t("إيرادات التشغيل والخدمات", "Operating Revenues")}
                    </h3>
                    <Table>
                      <TableBody>
                        {incomeStatement.revenueRows.map((row: any) => (
                          <TableRow key={row.account.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-0">
                            <TableCell className="ps-0 font-medium text-slate-700 dark:text-slate-300">
                              {row.account.code} - {getAccountName(row.account)}
                            </TableCell>
                            <TableCell className="text-end font-mono font-medium pe-0">
                              {formatCurrency(row.netBalance, isAr)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t font-bold bg-slate-50/20 dark:bg-slate-800/10">
                          <TableCell className="ps-0 text-slate-900 dark:text-slate-100">{t("إجمالي الإيرادات", "Total Revenues")}</TableCell>
                          <TableCell className="text-end font-mono text-emerald-600 dark:text-emerald-400 pe-0">
                            {formatCurrency(incomeStatement.totalRevenue, isAr)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Expenses Section */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 border-b pb-1">
                      {t("مصروفات التشغيل والإدارة", "Operating Expenses")}
                    </h3>
                    <Table>
                      <TableBody>
                        {incomeStatement.expenseRows.map((row: any) => (
                          <TableRow key={row.account.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-0">
                            <TableCell className="ps-0 font-medium text-slate-700 dark:text-slate-300">
                              {row.account.code} - {getAccountName(row.account)}
                            </TableCell>
                            <TableCell className="text-end font-mono font-medium pe-0">
                              {formatCurrency(row.netBalance, isAr)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t font-bold bg-slate-50/20 dark:bg-slate-800/10">
                          <TableCell className="ps-0 text-slate-900 dark:text-slate-100">{t("إجمالي المصروفات", "Total Expenses")}</TableCell>
                          <TableCell className="text-end font-mono text-rose-600 dark:text-rose-400 pe-0">
                            {formatCurrency(incomeStatement.totalExpense, isAr)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Profit Summary Card */}
                  <Card className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 rounded-xl overflow-hidden shadow-sm">
                    <CardContent className="p-6 flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {incomeStatement.netProfit >= 0 ? t("صافي الربح الفترتي", "Net Profit") : t("صافي الخسارة الفترتية", "Net Loss")}
                        </h4>
                        <p className="text-xs text-slate-400">{t("الفارق بين إيرادات ومصروفات الفترة", "Difference between revenues and expenses")}</p>
                      </div>
                      <span className={`text-xl font-bold font-mono ${incomeStatement.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {incomeStatement.netProfit >= 0 ? "+" : ""}{formatCurrency(incomeStatement.netProfit, isAr)}
                      </span>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Balance Sheet Tab */}
        <TabsContent value="balance-sheet">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building className="h-5 w-5 text-navy-600 dark:text-navy-400" />
                  {t("الميزانية العمومية والمركز المالي (Balance Sheet)", "Balance Sheet (Financial Position)")}
                </CardTitle>

                {/* Date select */}
                <div className="flex flex-col w-full md:w-auto space-y-1">
                  <Label className="text-xs text-slate-400">{t("كما في تاريخ", "As of Date")}</Label>
                  <Input type="date" value={balanceSheetDate} onChange={(e) => setBalanceSheetDate(e.target.value)} className="w-full md:w-44" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingBS ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !balanceSheet ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>{t("لا توجد حركات مالية مسجلة لتوليد الميزانية العمومية", "No transactions registered to generate Balance Sheet")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                  {/* Left Column: Assets */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-navy-600 dark:text-navy-400 border-b pb-1 flex justify-between">
                      <span>{t("الأصول (Assets)", "Assets")}</span>
                    </h3>
                    <Table>
                      <TableBody>
                        {balanceSheet.assetRows.map((row: any) => (
                          <TableRow key={row.account.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-0">
                            <TableCell className="ps-0 font-medium text-slate-700 dark:text-slate-300">
                              {row.account.code} - {getAccountName(row.account)}
                            </TableCell>
                            <TableCell className="text-end font-mono font-medium pe-0">
                              {formatCurrency(row.netBalance, isAr)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t font-bold bg-slate-50/20 dark:bg-slate-800/10">
                          <TableCell className="ps-0 text-slate-900 dark:text-slate-100">{t("إجمالي الأصول", "Total Assets")}</TableCell>
                          <TableCell className="text-end font-mono text-navy-600 dark:text-navy-400 pe-0">
                            {formatCurrency(balanceSheet.totalAssets, isAr)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Right Column: Liabilities & Equity */}
                  <div className="space-y-6">
                    {/* Liabilities */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 border-b pb-1">
                        {t("الالتزامات (Liabilities)", "Liabilities")}
                      </h3>
                      <Table>
                        <TableBody>
                          {balanceSheet.liabilityRows.map((row: any) => (
                            <TableRow key={row.account.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-0">
                              <TableCell className="ps-0 font-medium text-slate-700 dark:text-slate-300">
                                {row.account.code} - {getAccountName(row.account)}
                              </TableCell>
                              <TableCell className="text-end font-mono font-medium pe-0">
                                {formatCurrency(row.netBalance, isAr)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t font-bold bg-slate-50/20 dark:bg-slate-800/10">
                            <TableCell className="ps-0 text-slate-900 dark:text-slate-100">{t("إجمالي الالتزامات", "Total Liabilities")}</TableCell>
                            <TableCell className="text-end font-mono text-amber-600 dark:text-amber-400 pe-0">
                              {formatCurrency(balanceSheet.totalLiabilities, isAr)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Equity */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 border-b pb-1">
                        {t("حقوق الملكية (Equity)", "Equity")}
                      </h3>
                      <Table>
                        <TableBody>
                          {balanceSheet.equityRows.map((row: any) => (
                            <TableRow key={row.account.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-0">
                              <TableCell className="ps-0 font-medium text-slate-700 dark:text-slate-300">
                                {row.account.code} - {getAccountName(row.account)}
                              </TableCell>
                              <TableCell className="text-end font-mono font-medium pe-0">
                                {formatCurrency(row.netBalance, isAr)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Retained Earnings */}
                          <TableRow className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-0">
                            <TableCell className="ps-0 font-medium text-slate-700 dark:text-slate-300">
                              3100 - {t("الأرباح المبقاة (صافي الدخل التاريخي)", "Retained Earnings (Net Profit)")}
                            </TableCell>
                            <TableCell className="text-end font-mono font-medium pe-0">
                              {formatCurrency(balanceSheet.netRetainedEarnings, isAr)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-t font-bold bg-slate-50/20 dark:bg-slate-800/10">
                            <TableCell className="ps-0 text-slate-900 dark:text-slate-100">{t("إجمالي حقوق الملكية", "Total Equity")}</TableCell>
                            <TableCell className="text-end font-mono text-purple-600 dark:text-purple-400 pe-0">
                              {formatCurrency(balanceSheet.totalEquity, isAr)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Grand Total Liabilities & Equity */}
                    <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-3">
                      <div className="flex justify-between items-center font-bold bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border">
                        <div>
                          <span className="text-slate-900 dark:text-slate-100">{t("إجمالي الالتزامات وحقوق الملكية", "Total Liabilities & Equity")}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {balanceSheet.balancesMatch ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {t("متزنة ومتطابقة", "Balanced")}
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0">
                                <AlertCircle className="h-2.5 w-2.5" />
                                {t("غير متطابقة", "Unbalanced")}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-lg font-mono text-slate-900 dark:text-slate-100">
                          {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, isAr)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
