// ===== TYPES =====
export interface ClientBrief {
  id: string;
  name: string;
  COMPANY: string;
}

export interface ProjectRow {
  id: string;
  number: string;
  name: string;
  nameEn: string;
  location: string;
  plotNumber: string;
  type: string;
  status: string;
  progress: number;
  budget: number;
  client: ClientBrief;
  contractor: { id: string; name: string; companyName: string; category: string } | null;
  createdAt: string;
  _count: { tasks: number; stages: number; invoices: number };
}

// ===== STATUS CONFIGS =====
export const statusConfig: Record<string, { ar: string; en: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string; dotColor: string }> = {
  ACTIVE: { ar: "نشط", en: "Active", variant: "default", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200", dotColor: "bg-emerald-500" },
  COMPLETED: { ar: "مكتمل", en: "Completed", variant: "default", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200", dotColor: "bg-teal-500" },
  DELAYED: { ar: "متأخر", en: "Delayed", variant: "destructive", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200", dotColor: "bg-red-500" },
  ON_HOLD: { ar: "معلق", en: "On Hold", variant: "secondary", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200", dotColor: "bg-amber-500" },
  CANCELLED: { ar: "ملغى", en: "Cancelled", variant: "destructive", className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200", dotColor: "bg-slate-400" },
  DESIGN: { ar: "تصميم", en: "Design", variant: "default", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200", dotColor: "bg-violet-500" },
  SUBMISSION: { ar: "تقديم", en: "Submission", variant: "default", className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200", dotColor: "bg-sky-500" },
  APPROVAL: { ar: "اعتماد", en: "Approval", variant: "default", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200", dotColor: "bg-amber-500" },
  CONSTRUCTION: { ar: "تنفيذ", en: "Construction", variant: "default", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200", dotColor: "bg-orange-500" },
};

export const typeConfig: Record<string, { ar: string; en: string; color: string }> = {
  VILLA: { ar: "فيلا", en: "Villa", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  BUILDING: { ar: "مبنى", en: "Building", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  COMMERCIAL: { ar: "تجاري", en: "Commercial", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  INDUSTRIAL: { ar: "صناعي", en: "Industrial", color: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
};

// ===== CSRF Helpers =====
// Re-export from shared client utility for backward compatibility
export { getCsrfToken, getMutationHeaders } from "@/lib/csrf-client";
