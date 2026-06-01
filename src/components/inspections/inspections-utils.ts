// ===== Types =====
export interface Finding {
  id?: string;
  location: string;
  description: string;
  severity: string;
  category: string;
  photos: string;
  remediation: string;
  estimatedCost: number;
  status: string;
}

export interface InspectionItem {
  id: string;
  inspectionNumber: string;
  projectId: string | null;
  clientId: string | null;
  buildingName: string;
  buildingAddress: string;
  inspectionType: string;
  riskLevel: string;
  inspectionDate: string;
  nextInspectionDate: string | null;
  inspectorName: string;
  summary: string;
  recommendations: string;
  repairEstimate: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; company: string } | null;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  findings: Finding[];
  _count?: { photos: number; findings: number };
}

export interface Stats {
  total: number;
  green: number;
  yellow: number;
  orange: number;
  red: number;
  needsFollowup: number;
}

export interface ProjectOption { id: string; name: string; nameEn: string; number: string; }
export interface ClientOption { id: string; name: string; company: string; }

// ===== Constants =====
export const INSPECTION_TYPES = [
  { value: "STRUCTURAL", labelAr: "إنشائي", labelEn: "Structural" },
  { value: "crack", labelAr: "تشققات", labelEn: "Crack Assessment" },
  { value: "foundation", labelAr: "أساسات", labelEn: "Foundation" },
  { value: "concrete_core", labelAr: "عينات خرسانة", labelEn: "Concrete Core" },
  { value: "rebar_cover", labelAr: "غطاء حديد التسليح", labelEn: "Rebar Cover" },
  { value: "soil", labelAr: "تربة", labelEn: "Soil Investigation" },
  { value: "waterproofing", labelAr: "عزل مائي", labelEn: "Waterproofing" },
  { value: "ELECTRICAL", labelAr: "كهربائي", labelEn: "Electrical" },
  { value: "fire_safety", labelAr: "سلامة حريق", labelEn: "Fire Safety" },
];

export const SEVERITY_OPTIONS = [
  { value: "LOW", labelAr: "منخفض", labelEn: "Low" },
  { value: "MEDIUM", labelAr: "متوسط", labelEn: "Medium" },
  { value: "HIGH", labelAr: "عالي", labelEn: "High" },
  { value: "CRITICAL", labelAr: "حرج", labelEn: "Critical" },
];

export const CATEGORY_OPTIONS = [
  { value: "STRUCTURAL", labelAr: "إنشائي", labelEn: "Structural" },
  { value: "cosmetic", labelAr: "تجميلي", labelEn: "Cosmetic" },
  { value: "SAFETY", labelAr: "سلامة", labelEn: "Safety" },
  { value: "ELECTRICAL", labelAr: "كهربائي", labelEn: "Electrical" },
  { value: "PLUMBING", labelAr: "سباكة", labelEn: "Plumbing" },
];

export const FINDING_STATUS_OPTIONS = [
  { value: "OPEN", labelAr: "مفتوح", labelEn: "Open" },
  { value: "IN_PROGRESS", labelAr: "قيد التنفيذ", labelEn: "In Progress" },
  { value: "RESOLVED", labelAr: "تم الحل", labelEn: "Resolved" },
];

// ===== Helpers =====
export function getRiskConfig(level: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string; icon: string }> = {
    green: { label: "آمن", labelEn: "Safe", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", icon: "🟢" },
    yellow: { label: "يحتاج صيانة", labelEn: "Needs Maintenance", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800", icon: "🟡" },
    orange: { label: "يحتاج ترميم", labelEn: "Needs Repair", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800", icon: "🟠" },
    red: { label: "خطر", labelEn: "Dangerous", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800", icon: "🔴" },
  };
  return configs[level] || configs.green;
}

export function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string }> = {
    DRAFT: { label: "مسودة", labelEn: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    COMPLETED: { label: "مكتمل", labelEn: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    sent_to_client: { label: "أُرسل للعميل", labelEn: "Sent to Client", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    followup_needed: { label: "يحتاج متابعة", labelEn: "Follow-up Needed", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  };
  return configs[status] || configs.DRAFT;
}

export function getInspectionTypeLabel(type: string, ar: boolean) {
  const found = INSPECTION_TYPES.find((t) => t.value === type);
  return found ? (ar ? found.labelAr : found.labelEn) : type;
}

export function emptyFinding(): Finding {
  return { location: "", description: "", severity: "LOW", category: "STRUCTURAL", photos: "", remediation: "", estimatedCost: 0, status: "OPEN" };
}
