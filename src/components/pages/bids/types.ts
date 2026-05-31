// ===== Types =====
interface ContractorBasic {
  id: string;
  name: string;
  nameEn: string;
  companyName: string;
  companyEn: string;
  category: string;
  rating: number;
  _count: { bids: number; evaluations: number };
}

interface EvaluationItem {
  id: string;
  contractorId: string;
  projectId: string;
  bidId: string | null;
  criteria: string;
  score: number;
  maxScore: number;
  weight: number;
  notes: string;
  evaluatedBy: string;
  createdAt: string;
}

interface BidItem {
  id: string;
  contractorName: string;
  contractorContact: string;
  contractorId: string | null;
  amount: number;
  status: string;
  notes: string;
  projectId: string;
  createdAt: string;
  deadline: string | null;
  technicalScore: number;
  financialScore: number;
  totalScore: number;
  evaluationNotes: string;
  project: { id: string; name: string; nameEn: string; number: string };
  contractor: ContractorBasic | null;
  evaluations: EvaluationItem[];
}

interface ContractorFull {
  id: string;
  name: string;
  nameEn: string;
  companyName: string;
  companyEn: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  crNumber: string;
  licenseNumber: string;
  licenseExpiry: string | null;
  category: string;
  rating: number;
  specialties: string;
  experience: string;
  bankName: string;
  bankAccount: string;
  iban: string;
  isActive: boolean;
  notes: string;
  _count: { bids: number; evaluations: number };
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }

// ===== Helpers =====

function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string; gradient: string }> = {
    SUBMITTED: { ar: "مقدم", en: "Submitted", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300", gradient: "from-sky-500 to-sky-600" },
    UNDER_REVIEW: { ar: "قيد المراجعة", en: "Under Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", gradient: "from-amber-500 to-amber-600" },
    ACCEPTED: { ar: "مقبول", en: "Accepted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", gradient: "from-emerald-500 to-emerald-600" },
    REJECTED: { ar: "مرفوض", en: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", gradient: "from-red-500 to-red-600" },
  };
  return configs[status] || configs.SUBMITTED;
}

function getCategoryConfig(cat: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    CIVIL: { ar: "أشغال مدنية", en: "Civil", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
    ELECTRICAL: { ar: "كهرباء", en: "Electrical", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" },
    MEP: { ar: "MEP", en: "MEP", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
    FINISHING: { ar: "تشطيبات", en: "Finishing", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300" },
    PLUMBING: { ar: "سباكة", en: "Plumbing", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
    HVAC: { ar: "تكييف", en: "HVAC", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
  };
  return configs[cat] || { ar: cat, en: cat, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
}

const EVALUATION_CRITERIA = [
  { key: "experience", ar: "الخبرة", en: "Experience", weight: 30 },
  { key: "FINANCIAL", ar: "القدرة المالية", en: "Financial Capacity", weight: 25 },
  { key: "TECHNICAL", ar: "القدرة التقنية", en: "Technical Capability", weight: 25 },
  { key: "past_performance", ar: "الأداء السابق", en: "Past Performance", weight: 20 },
];

export type { ContractorBasic, EvaluationItem, BidItem, ContractorFull, ProjectOption };
export { getStatusConfig, getCategoryConfig, EVALUATION_CRITERIA };
