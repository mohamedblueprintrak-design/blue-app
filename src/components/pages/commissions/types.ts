// ===== Types =====
export interface CommissionItem {
  id: string;
  userId: string;
  projectId: string | null;
  type: string;
  amount: number;
  currency: string;
  percentage: number;
  baseAmount: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  description: string;
  paidDate: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  project: { id: string; name: string; nameEn: string; number: string } | null;
  approver: { id: string; name: string } | null;
}

export interface ReferralItem {
  id: string;
  referrerId: string;
  referredName: string;
  referredPhone: string;
  referredEmail: string;
  projectId: string | null;
  status: string;
  discountGiven: number;
  rewardAmount: number;
  notes: string;
  createdAt: string;
  referrer: { id: string; name: string; email: string };
  project: { id: string; name: string; nameEn: string; number: string } | null;
}

export interface CampaignItem {
  id: string;
  name: string;
  type: string;
  budget: number;
  spent: number;
  leads: number;
  conversions: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  notes: string;
  createdAt: string;
}

export interface UserOption {
  id: string;
  name: string;
  EMAIL: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

// ===== Helpers =====
export function getCommissionStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    PENDING: { ar: "معلّق", en: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    APPROVED: { ar: "معتمد", en: "Approved", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" },
    PAID: { ar: "مدفوع", en: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    CANCELLED: { ar: "ملغي", en: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  };
  return configs[status] || configs.PENDING;
}

export function getReferralStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    PENDING: { ar: "معلّق", en: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    CONVERTED: { ar: "تم التحويل", en: "Converted", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" },
    rewarded: { ar: "تم المكافأة", en: "Rewarded", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    EXPIRED: { ar: "منتهي", en: "Expired", color: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400" },
  };
  return configs[status] || configs.PENDING;
}

export function getCampaignStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    ACTIVE: { ar: "نشط", en: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    PAUSED: { ar: "متوقف", en: "Paused", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    COMPLETED: { ar: "مكتمل", en: "Completed", color: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400" },
  };
  return configs[status] || configs.ACTIVE;
}

export function getCommissionTypeConfig(type: string) {
  const configs: Record<string, { ar: string; en: string }> = {
    project_referral: { ar: "إحالة مشروع", en: "Project Referral" },
    completion_bonus: { ar: "مكافأة إنجاز", en: "Completion Bonus" },
    client_satisfaction: { ar: "رضا العميل", en: "Client Satisfaction" },
    performance: { ar: "أداء مميز", en: "Performance" },
  };
  return configs[type] || { ar: type, en: type };
}

export function getCampaignTypeConfig(type: string) {
  const configs: Record<string, { ar: string; en: string }> = {
    SOCIAL_MEDIA: { ar: "وسائل التواصل", en: "Social Media" },
    google_ads: { ar: "إعلانات جوجل", en: "Google Ads" },
    REFERRAL: { ar: "إحالات", en: "Referral" },
    DIRECT: { ar: "مباشر", en: "Direct" },
    exhibition: { ar: "معارض", en: "Exhibition" },
  };
  return configs[type] || { ar: type, en: type };
}
