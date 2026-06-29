"use client";

export function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string; pill: string }> = {
    DRAFT: {
      ar: "مسودة", en: "Draft",
      color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      pill: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300",
    },
    PENDING_SIGNATURE: {
      ar: "بانتظار التوقيع", en: "Pending Signature",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      pill: "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900/50 dark:to-amber-800/50 dark:text-amber-300",
    },
    ACTIVE: {
      ar: "نشط", en: "Active",
      color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
      pill: "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/50 dark:to-emerald-800/50 dark:text-emerald-300",
    },
    EXPIRED: {
      ar: "منتهي", en: "Expired",
      color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
      pill: "bg-gradient-to-r from-red-100 to-red-200 text-red-700 dark:from-red-900/50 dark:to-red-800/50 dark:text-red-300",
    },
    COMPLETED: {
      ar: "مكتمل", en: "Completed",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      pill: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-300",
    },
  };
  return configs[status] || configs.DRAFT;
}

export function getTypeLabel(type: string, ar: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    ENGINEERING_SERVICES: { ar: "خدمات هندسية", en: "Engineering Services" },
    CONSTRUCTION: { ar: "بناء", en: "Construction" },
    CONSULTING: { ar: "استشارات", en: "Consulting" },
    MAINTENANCE: { ar: "صيانة", en: "Maintenance" },
  };
  return ar ? (labels[type]?.ar || type) : (labels[type]?.en || type);
}

export function getAmendmentStatus(status: string, ar: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    PENDING: { ar: "معلّق", en: "Pending" },
    APPROVED: { ar: "معتمد", en: "Approved" },
    REJECTED: { ar: "مرفوض", en: "Rejected" },
  };
  return ar ? (labels[status]?.ar || status) : (labels[status]?.en || status);
}
