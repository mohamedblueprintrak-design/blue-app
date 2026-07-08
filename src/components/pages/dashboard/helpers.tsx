import { cn } from "@/lib/utils";
import {
  XCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatusIcon } from "@/components/ui/status-icon";

import { formatToHijri } from "@/lib/hijri-utils";

// ===== Formatting Helpers =====

/**
 * Format a number as currency for dashboard display.
 * SECURITY FIX: Accepts string|number because Prisma Decimal fields are
 * serialized as strings in JSON. Without Number() conversion, string
 * values cause garbage output from Intl.NumberFormat.
 */
export function formatCurrency(amount: number | string, locale: string): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(num: number | string, locale: string): string {
  const n = Number(num) || 0;
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-US").format(n);
}

// ===== Time Helpers =====

export function timeAgo(dateStr: string, isAr: boolean): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return isAr ? "الآن" : "Just now";
  if (diffMins < 60) return isAr ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays === 1) return isAr ? "أمس" : "Yesterday";
  if (diffDays < 7) return isAr ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
  if (diffDays < 30) return isAr ? `منذ ${Math.floor(diffDays / 7)} أسابيع` : `${Math.floor(diffDays / 7)}w ago`;
  return isAr ? `منذ ${Math.floor(diffDays / 30)} أشهر` : `${Math.floor(diffDays / 30)}mo ago`;
}

export function daysUntil(dueDate: string | null): number {
  if (!dueDate) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format a due date with Hijri calendar support.
 * Shows both Gregorian and Hijri dates in Arabic mode.
 * Returns "—" if no date.
 */
export function formatDueDate(dueDate: string | null, isAr: boolean): string {
  if (!dueDate) return "—";
  try {
    const date = new Date(dueDate);
    const gregorian = date.toLocaleDateString(isAr ? "ar-AE" : "en-US", {
      month: "short",
      day: "numeric",
    });

    if (isAr) {
      try {
        const hijri = formatToHijri(date, { day: 'numeric', month: 'short', locale: 'ar' });
        return `${gregorian} (${hijri})`;
      } catch {
        return gregorian;
      }
    }
    return gregorian;
  } catch {
    return dueDate;
  }
}

// ===== Avatar Helpers =====

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-brand-navy-500",
  "bg-amber-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-orange-500",
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ===== Status Badge Helper =====

export function getStatusBadge(status: string, isAr: boolean) {
  const map: Record<string, { labelAr: string; labelEn: string; dotColor: string; className: string }> = {
    ACTIVE: { labelAr: "نشط", labelEn: "Active", dotColor: "bg-emerald-500", className: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" },
    COMPLETED: { labelAr: "مكتمل", labelEn: "Completed", dotColor: "bg-brand-navy-500", className: "bg-brand-navy-50 dark:bg-brand-navy-950/50 text-brand-navy-700 dark:text-brand-navy-400 border border-brand-navy-200 dark:border-brand-navy-800" },
    DELAYED: { labelAr: "متأخر", labelEn: "Delayed", dotColor: "bg-red-500", className: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800" },
    ON_HOLD: { labelAr: "معلق", labelEn: "On Hold", dotColor: "bg-amber-500", className: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" },
    CANCELLED: { labelAr: "ملغى", labelEn: "Cancelled", dotColor: "bg-slate-400", className: "bg-slate-50 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700" },
  };
  const item = map[status] || map.ACTIVE;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full", item.className)}>
      <StatusIcon status={status} className="h-3 w-3" />
      {isAr ? item.labelAr : item.labelEn}
    </span>
  );
}

// ===== Alert Helpers =====

export function getAlertIcon(severity: "HIGH" | "MEDIUM" | "LOW"): LucideIcon {
  switch (severity) {
    case "HIGH": return XCircle;
    case "MEDIUM": return AlertTriangle;
    default: return AlertCircle;
  }
}

export function getAlertIconColor(severity: "HIGH" | "MEDIUM" | "LOW"): string {
  switch (severity) {
    case "HIGH": return "text-red-500 bg-red-100 dark:bg-red-950/50";
    case "MEDIUM": return "text-amber-500 bg-amber-100 dark:bg-amber-950/50";
    default: return "text-blue-500 bg-blue-100 dark:bg-blue-950/50";
  }
}

export function getAlertBorderColor(severity: "HIGH" | "MEDIUM" | "LOW"): string {
  switch (severity) {
    case "HIGH": return "border-s-4 border-s-red-400 dark:border-s-red-600 border-slate-200 dark:border-slate-700/50";
    case "MEDIUM": return "border-s-4 border-s-amber-400 dark:border-s-amber-600 border-slate-200 dark:border-slate-700/50";
    default: return "border-s-4 border-s-blue-400 dark:border-s-blue-600 border-slate-200 dark:border-slate-700/50";
  }
}

export function getAlertBgColor(severity: "HIGH" | "MEDIUM" | "LOW"): string {
  switch (severity) {
    case "HIGH": return "bg-red-50/50 dark:bg-red-950/10";
    case "MEDIUM": return "bg-amber-50/50 dark:bg-amber-950/10";
    default: return "bg-blue-50/50 dark:bg-blue-950/10";
  }
}
