// ===== Helpers =====
function getCategoryConfig(cat: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    CIVIL: { ar: "أشغال مدنية", en: "Civil", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
    ELECTRICAL: { ar: "كهرباء", en: "Electrical", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" },
    MEP: { ar: "MEP", en: "MEP", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
    FINISHING: { ar: "تشطيبات", en: "Finishing", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300" },
    PLUMBING: { ar: "سباكة", en: "Plumbing", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
    HVAC: { ar: "تكييف", en: "HVAC", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
    general: { ar: "عام", en: "General", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  };
  return configs[cat] || { ar: cat, en: cat, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
}

function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    SUBMITTED: { ar: "مقدم", en: "Submitted", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" },
    UNDER_REVIEW: { ar: "قيد المراجعة", en: "Under Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    ACCEPTED: { ar: "مقبول", en: "Accepted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    REJECTED: { ar: "مرفوض", en: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  };
  return configs[status] || configs.SUBMITTED;
}

function getRFQStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    DRAFT: { ar: "مسودة", en: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    SENT: { ar: "مرسل", en: "Sent", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" },
    in_review: { ar: "قيد المراجعة", en: "In Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    AWARDED: { ar: "تم الترسية", en: "Awarded", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    CANCELLED: { ar: "ملغي", en: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  };
  return configs[status] || configs.DRAFT;
}

export { getCategoryConfig, getStatusConfig, getRFQStatusConfig };
