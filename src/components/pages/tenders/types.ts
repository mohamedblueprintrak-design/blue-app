// ===== Types =====
export interface TenderItem {
  id: string;
  tenderNumber: string;
  title: string;
  authority: string;
  projectType: string;
  description: string;
  estimatedBudget: number;
  currency: string;
  closingDate: string | null;
  submissionDate: string | null;
  qualifications: string;
  requiredDocs: string;
  status: string;
  winnerName: string;
  lostReason: string;
  competitorAnalysis: string;
  notes: string;
  source: string;
  sourceUrl: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser: { id: string; name: string; email: string } | null;
  _count: { documents: number };
}

export interface TenderDetail extends TenderItem {
  documents: TenderDoc[];
}

export interface TenderDoc {
  id: string;
  tenderId: string;
  name: string;
  fileType: string;
  filePath: string;
  uploadedAt: string;
}

export interface TendersResponse {
  data: TenderItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TenderFormData {
  tenderNumber: string;
  title: string;
  authority: string;
  projectType: string;
  description: string;
  estimatedBudget: string;
  currency: string;
  closingDate: string;
  submissionDate: string;
  qualifications: string;
  requiredDocs: string;
  status: string;
  winnerName: string;
  lostReason: string;
  competitorAnalysis: string;
  notes: string;
  source: string;
  sourceUrl: string;
  assignedTo: string;
}

export interface TendersPageProps {
  language: "ar" | "en";
}

// ===== Helpers =====
export function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string; pill: string }> = {
    IDENTIFIED: {
      ar: "مُحدّدة", en: "Identified",
      color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      pill: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300",
    },
    PREPARING: {
      ar: "قيد التحضير", en: "Preparing",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      pill: "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900/50 dark:to-amber-800/50 dark:text-amber-300",
    },
    SUBMITTED: {
      ar: "مقدّمة", en: "Submitted",
      color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
      pill: "bg-gradient-to-r from-sky-100 to-sky-200 text-sky-700 dark:from-sky-900/50 dark:to-sky-800/50 dark:text-sky-300",
    },
    QUALIFIED: {
      ar: "مؤهّلة", en: "Qualified",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
      pill: "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 dark:from-purple-900/50 dark:to-purple-800/50 dark:text-purple-300",
    },
    WON: {
      ar: "فُزنا", en: "Won",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      pill: "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/50 dark:to-emerald-800/50 dark:text-emerald-300",
    },
    LOST: {
      ar: "خسرنا", en: "Lost",
      color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
      pill: "bg-gradient-to-r from-red-100 to-red-200 text-red-700 dark:from-red-900/50 dark:to-red-800/50 dark:text-red-300",
    },
  };
  return configs[status] || configs.IDENTIFIED;
}

export function getAuthorityConfig(auth: string) {
  const configs: Record<string, { ar: string; en: string }> = {
    "rak_municipality": { ar: "بلدية رأس الخيمة", en: "RAK Municipality" },
    "rak_properties": { ar: "RAK Properties", en: "RAK Properties" },
    "al_hamra": { ar: "الحمراء", en: "Al Hamra" },
    "marjan": { ar: "مرجان", en: "Marjan" },
    "rakez": { ar: "RAKEZ", en: "RAKEZ" },
    "private": { ar: "خاصة", en: "Private" },
  };
  return configs[auth] || { ar: auth, en: auth };
}

export function getProjectTypeLabel(type: string, ar: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    VILLA: { ar: "فيلا", en: "Villa" },
    BUILDING: { ar: "مبنى", en: "Building" },
    infrastructure: { ar: "بنية تحتية", en: "Infrastructure" },
    road: { ar: "طريق", en: "Road" },
    landscape: { ar: "تنسيق مواقع", en: "Landscape" },
  };
  return ar ? (labels[type]?.ar || type) : (labels[type]?.en || type);
}

// ===== Empty Form =====
export const emptyForm: TenderFormData = {
  tenderNumber: "",
  title: "",
  authority: "",
  projectType: "VILLA",
  description: "",
  estimatedBudget: "0",
  currency: "AED",
  closingDate: "",
  submissionDate: "",
  qualifications: "",
  requiredDocs: "",
  status: "IDENTIFIED",
  winnerName: "",
  lostReason: "",
  competitorAnalysis: "",
  notes: "",
  source: "",
  sourceUrl: "",
  assignedTo: "",
};
