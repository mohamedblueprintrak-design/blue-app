"use client";

import { StatusIcon } from "@/components/ui/status-icon";
import { cn } from "@/lib/utils";
import type { InvoiceItem } from "./types";

export function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    DRAFT: { ar: "\u0645\u0633\u0648\u062f\u0629", en: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
    SENT: { ar: "\u0645\u0631\u0633\u0644\u0629", en: "Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" },
    PARTIALLY_PAID: { ar: "\u0645\u062f\u0641\u0648\u0639\u0629 \u062c\u0632\u0626\u064a\u0627\u064b", en: "Partial", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" },
    PAID: { ar: "\u0645\u062f\u0641\u0648\u0639\u0629", en: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" },
    OVERDUE: { ar: "\u0645\u062a\u0623\u062e\u0631\u0629", en: "Overdue", color: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300" },
    CANCELLED: { ar: "\u0645\u0644\u063a\u0627\u0629", en: "Cancelled", color: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400" },
  };
  return configs[status] || configs.DRAFT;
}

export function getEmptyLineItem(): InvoiceItem {
  return { description: "", quantity: 1, unitPrice: 0, total: 0 };
}

export function getAmountColor(status: string) {
  if (status === "OVERDUE") return "text-red-600 dark:text-red-400";
  if (status === "PAID") return "text-emerald-600 dark:text-emerald-400";
  if (status === "SENT" || status === "PARTIALLY_PAID") return "text-amber-600 dark:text-amber-400";
  return "text-slate-700 dark:text-slate-300";
}
