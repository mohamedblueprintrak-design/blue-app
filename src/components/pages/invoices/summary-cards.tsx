"use client";

import { Receipt, Wallet, Clock, FileWarning } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface SummaryCardsProps {
  ar: boolean;
  totalInvoices: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
}

export function SummaryCards({
  ar,
  totalInvoices,
  totalPaid,
  totalOutstanding,
  overdueCount,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total */}
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Receipt className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-teal-100">{ar ? "إجمالي الفواتير" : "Total Invoices"}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{formatCurrency(totalInvoices, ar)}</div>
        </div>
      </Card>

      {/* Collected */}
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Wallet className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-emerald-100">{ar ? "إجمالي المحصل" : "Total Collected"}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{formatCurrency(totalPaid, ar)}</div>
        </div>
      </Card>

      {/* Outstanding */}
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Clock className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-amber-100">{ar ? "المتبقي" : "Outstanding"}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{formatCurrency(totalOutstanding, ar)}</div>
        </div>
      </Card>

      {/* Overdue */}
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><FileWarning className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-red-100">{ar ? "متأخرة" : "Overdue"}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{overdueCount}</div>
        </div>
      </Card>
    </div>
  );
}
