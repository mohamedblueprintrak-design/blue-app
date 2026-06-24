import { FileText, CreditCard, ShoppingCart, RefreshCw, CalendarOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getStatusIcon } from "@/components/ui/status-icon";
import type { StatusFilterTab, EntityFilter, DateFilter } from "./types";

// ===== Time helpers =====

export function timeAgo(dateStr: string, ar: boolean): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (ar) {
    if (minutes < 1) return "الآن";
    if (minutes === 1) return "منذ دقيقة";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours === 1) return "منذ ساعة";
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days === 1) return "أمس";
    if (days < 7) return `منذ ${days} يوم`;
    return new Date(dateStr).toLocaleDateString("ar-AE");
  }
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US");
}

// ===== Entity type helpers =====

export function getEntityTypeIcon(type: string) {
  switch (type) {
    case "invoice": return FileText;
    case "payment": return CreditCard;
    case "purchase_order": return ShoppingCart;
    case "change_order": return RefreshCw;
    case "LEAVE": return CalendarOff;
    default: return FileText;
  }
}

export function getEntityTypeBadgeColor(type: string) {
  const colors: Record<string, string> = {
    invoice: "bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/40 dark:text-brand-navy-300",
    payment: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    purchase_order: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    change_order: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    LEAVE: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  };
  return colors[type] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export function getEntityTypeLabel(type: string, ar: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    invoice: { ar: "فاتورة", en: "Invoice" },
    payment: { ar: "دفعة", en: "Payment" },
    purchase_order: { ar: "أمر شراء", en: "Purchase Order" },
    change_order: { ar: "أمر تغيير", en: "Change Order" },
    LEAVE: { ar: "إجازة", en: "Leave" },
  };
  return labels[type]?.[ar ? "ar" : "en"] || type;
}

// ===== Status helpers =====

export function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string; bgColor: string; dot: string; icon: LucideIcon }> = {
    PENDING: { ar: "معلّقة", en: "Pending", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/40", dot: "bg-amber-500", icon: getStatusIcon("pending") },
    APPROVED: { ar: "معتمدة", en: "Approved", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", dot: "bg-emerald-500", icon: getStatusIcon("approved") },
    REJECTED: { ar: "مرفوضة", en: "Rejected", color: "text-red-700 dark:text-red-300", bgColor: "bg-red-100 dark:bg-red-900/40", dot: "bg-red-500", icon: getStatusIcon("rejected") },
    CANCELLED: { ar: "ملغاة", en: "Cancelled", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800/40", dot: "bg-slate-400", icon: getStatusIcon("cancelled") },
  };
  return configs[status] || configs.PENDING;
}

// ===== Hash color helpers =====

export function getHashColor(name: string): string {
  const colors = [
    "bg-brand-navy-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500",
    "bg-violet-500", "bg-rose-500", "bg-sky-500", "bg-lime-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function _getHashRing(name: string): string {
  const colors = [
    "ring-brand-navy-200 dark:ring-brand-navy-800",
    "ring-cyan-200 dark:ring-cyan-800",
    "ring-emerald-200 dark:ring-emerald-800",
    "ring-amber-200 dark:ring-amber-800",
    "ring-violet-200 dark:ring-violet-800",
    "ring-rose-200 dark:ring-rose-800",
    "ring-sky-200 dark:ring-sky-800",
    "ring-lime-200 dark:ring-lime-800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ===== Filter label helpers =====

export function getFilterLabel(tab: StatusFilterTab, ar: boolean) {
  const labels: Record<StatusFilterTab, { ar: string; en: string }> = {
    all: { ar: "الكل", en: "All" },
    PENDING: { ar: "معلّقة", en: "Pending" },
    APPROVED: { ar: "معتمدة", en: "Approved" },
    REJECTED: { ar: "مرفوضة", en: "Rejected" },
    CANCELLED: { ar: "ملغاة", en: "Cancelled" },
  };
  return labels[tab][ar ? "ar" : "en"];
}

export function getEntityFilterLabel(f: EntityFilter, ar: boolean) {
  if (f === "all") return ar ? "الكل" : "All";
  return getEntityTypeLabel(f, ar);
}

export function getDateFilterLabel(f: DateFilter, ar: boolean) {
  const labels: Record<DateFilter, { ar: string; en: string }> = {
    all: { ar: "الكل", en: "All Time" },
    week: { ar: "هذا الأسبوع", en: "This Week" },
    month: { ar: "هذا الشهر", en: "This Month" },
    quarter: { ar: "هذا الربع", en: "This Quarter" },
  };
  return labels[f][ar ? "ar" : "en"];
}

export function getDateThreshold(f: DateFilter): number | null {
  const now = Date.now();
  switch (f) {
    case "week": return now - 7 * 86400000;
    case "month": return now - 30 * 86400000;
    case "quarter": return now - 90 * 86400000;
    default: return null;
  }
}
