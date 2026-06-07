import { Globe, Share2, Footprints, Megaphone, MessageCircle, Users, Phone, Mail, FileText } from 'lucide-react';

// ===== Types =====
export interface Client {
  id: string;
  name: string;
  nameEn?: string;
  company: string;
  companyEn?: string;
  clientType?: string;
  idNumber?: string;
  nationality?: string;
  idPhoto?: string;
  email: string;
  phone: string;
  extraPhone?: string;
  address: string;
  fullAddress?: string;
  taxNumber: string;
  creditLimit: number;
  creditUsed: number;
  paymentTerms: string;
  servicesWanted?: string;
  projectType?: string;
  landLocation?: string;
  landArea?: string;
  plotNumber?: string;
  planNumber?: string;
  landDocuments?: string;
  notes?: string;
  referralSource?: string;
  referralDetail?: string;
  _count: { projects: number; invoices: number; contracts: number };
  projects?: ClientProject[];
  invoices?: ClientInvoice[];
  contracts?: ClientContract[];
  interactions?: ClientInteraction[];
  serviceType?: string;
  serviceNotes?: string;
}

export interface ClientProject {
  id: string;
  number: string;
  name: string;
  nameEn: string;
  status: string;
  type: string;
}

export interface ClientInvoice {
  id: string;
  number: string;
  total: number;
  paidAmount: number;
  remaining: number;
  status: string;
  issueDate: string;
  dueDate: string;
}

export interface ClientContract {
  id: string;
  number: string;
  title: string;
  value: number;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

export interface ClientInteraction {
  id: string;
  type: string;
  date: string;
  subject: string;
  description: string;
  outcome: string;
  projectId: string;
}

export interface FullAddressData {
  emirate?: string;
  city?: string;
  area?: string;
  street?: string;
  building?: string;
  unit?: string;
}

// ===== Constants =====
export const NATIONALITIES = [
  { value: "emirati", ar: "إماراتي", en: "Emirati" },
  { value: "saudi", ar: "سعودي", en: "Saudi" },
  { value: "kuwaiti", ar: "كويتي", en: "Kuwaiti" },
  { value: "bahraini", ar: "بحريني", en: "Bahraini" },
  { value: "omani", ar: "عماني", en: "Omani" },
  { value: "qatari", ar: "قطري", en: "Qatari" },
  { value: "jordanian", ar: "أردني", en: "Jordanian" },
  { value: "egyptian", ar: "مصري", en: "Egyptian" },
  { value: "syrian", ar: "سوري", en: "Syrian" },
  { value: "lebanese", ar: "لبناني", en: "Lebanese" },
  { value: "iraqi", ar: "عراقي", en: "Iraqi" },
  { value: "yemeni", ar: "يمني", en: "Yemeni" },
  { value: "sudanese", ar: "سوداني", en: "Sudanese" },
  { value: "moroccan", ar: "مغربي", en: "Moroccan" },
  { value: "tunisian", ar: "تونسي", en: "Tunisian" },
  { value: "algerian", ar: "جزائري", en: "Algerian" },
  { value: "libyan", ar: "ليبي", en: "Libyan" },
  { value: "palestinian", ar: "فلسطيني", en: "Palestinian" },
  { value: "indian", ar: "هندي", en: "Indian" },
  { value: "pakistani", ar: "باكستاني", en: "Pakistani" },
  { value: "bangladeshi", ar: "بنجلاديشي", en: "Bangladeshi" },
  { value: "filipino", ar: "فلبيني", en: "Filipino" },
  { value: "other", ar: "أخرى", en: "Other" },
];

export const EMIRATES = [
  { value: "ABU_DHABI", ar: "أبو ظبي", en: "Abu Dhabi" },
  { value: "DUBAI", ar: "دبي", en: "Dubai" },
  { value: "SHARJAH", ar: "الشارقة", en: "Sharjah" },
  { value: "AJMAN", ar: "عجمان", en: "Ajman" },
  { value: "UMM_AL_QUWAIN", ar: "أم القيوين", en: "Umm Al Quwain" },
  { value: "RAS_AL_KHAIMAH", ar: "رأس الخيمة", en: "Ras Al Khaimah" },
  { value: "FUJAIRAH", ar: "الفجيرة", en: "Fujairah" },
];

export const SERVICES = [
  { value: "consultation", ar: "استشارة هندسية", en: "Consultation" },
  { value: "architectural_design", ar: "تصميم معماري", en: "Architectural Design" },
  { value: "structural_design", ar: "تصميم إنشائي", en: "Structural Design" },
  { value: "mep_design", ar: "تصميم MEP", en: "MEP Design" },
  { value: "municipality_license", ar: "استخراج ترخيص بلدي", en: "Municipality License" },
  { value: "construction_supervision", ar: "إشراف على التنفيذ", en: "Construction Supervision" },
  { value: "engineering_inspection", ar: "فحص هندسي", en: "Engineering Inspection" },
  { value: "project_management", ar: "إدارة مشاريع", en: "Project Management" },
  { value: "other", ar: "أخرى", en: "Other" },
];

export const PROJECT_TYPES = [
  { value: "VILLA", ar: "فيلا", en: "Villa" },
  { value: "APARTMENT", ar: "شقة", en: "Apartment" },
  { value: "COMMERCIAL", ar: "تجاري", en: "Commercial" },
  { value: "INDUSTRIAL", ar: "صناعي", en: "Industrial" },
  { value: "RESIDENTIAL_BUILDING", ar: "عمارة سكنية", en: "Residential Building" },
  { value: "MEDICAL", ar: "طبي", en: "Medical" },
  { value: "other", ar: "أخرى", en: "Other" },
];

export const LAND_PROJECT_TYPES = ["VILLA", "COMMERCIAL", "INDUSTRIAL", "RESIDENTIAL_BUILDING"];

export const REFERRAL_SOURCES = [
  { value: "SOCIAL_MEDIA", ar: "وسائل التواصل الاجتماعي", en: "Social Media", icon: Globe },
  { value: "REFERRAL", ar: "إحالة من عميل", en: "Client Referral", icon: Share2 },
  { value: "WEBSITE", ar: "الموقع الإلكتروني", en: "Website", icon: Globe },
  { value: "WALK_IN", ar: "زيارة مباشرة", en: "Walk-in", icon: Footprints },
  { value: "ADVERTISEMENT", ar: "إعلان", en: "Advertisement", icon: Megaphone },
  { value: "other", ar: "أخرى", en: "Other", icon: MessageCircle },
];

export const SERVICE_LABELS: Record<string, { ar: string; en: string }> = {};
SERVICES.forEach((s) => { SERVICE_LABELS[s.value] = { ar: s.ar, en: s.en }; });

export const PROJECT_TYPE_LABELS: Record<string, { ar: string; en: string }> = {};
PROJECT_TYPES.forEach((p) => { PROJECT_TYPE_LABELS[p.value] = { ar: p.ar, en: p.en }; });

export const REFERRAL_LABELS: Record<string, { ar: string; en: string }> = {};
REFERRAL_SOURCES.forEach((r) => { REFERRAL_LABELS[r.value] = { ar: r.ar, en: r.en }; });

export const CLIENT_TYPE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  INDIVIDUAL: { ar: "فرد", en: "Individual", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" },
  COMPANY: { ar: "شركة", en: "Company", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  GOVERNMENT: { ar: "حكومة", en: "Government", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
};

// ===== Helpers =====
export function getContractStatusBadge(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    DRAFT: { ar: "مسودة", en: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
    PENDING_SIGNATURE: { ar: "بانتظار التوقيع", en: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" },
    ACTIVE: { ar: "نشط", en: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" },
    EXPIRED: { ar: "منتهي", en: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300" },
    COMPLETED: { ar: "مكتمل", en: "Completed", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" },
  };
  const cfg = configs[status] || configs.DRAFT;
  return { ...cfg, status };
}

export function getInvoiceStatusBadge(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    DRAFT: { ar: "مسودة", en: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
    SENT: { ar: "مرسلة", en: "Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" },
    PARTIALLY_PAID: { ar: "مدفوعة جزئياً", en: "Partial", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" },
    PAID: { ar: "مدفوعة", en: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" },
    OVERDUE: { ar: "متأخرة", en: "Overdue", color: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300" },
    CANCELLED: { ar: "ملغاة", en: "Cancelled", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
  };
  const cfg = configs[status] || configs.DRAFT;
  return { ...cfg, status };
}

export function getInteractionIcon(type: string) {
  switch (type) {
    case "MEETING": return Users;
    case "CALL": return Phone;
    case "EMAIL": return Mail;
    default: return FileText;
  }
}

export function getAvatarColor(name: string) {
  const colors = [
    "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300",
    "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
    "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
    "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300",
    "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300",
    "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function parseFullAddress(json: string | Record<string, unknown> | undefined | null): FullAddressData {
  if (!json) return {};
  if (typeof json === 'object') return json as FullAddressData;
  try { return JSON.parse(json as string) as FullAddressData; } catch { return {}; }
}

export function parseServicesWanted(json: string | string[] | undefined | null): string[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  try { return JSON.parse(json as string) as string[]; } catch { return []; }
}

export function parseLandDocuments(json: string | { type: string; path: string }[] | undefined | null): { type: string; path: string }[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  try { return JSON.parse(json as string) as { type: string; path: string }[]; } catch { return []; }
}

export function getNationalityLabel(val: string | undefined, ar: boolean): string {
  if (!val) return "";
  const found = NATIONALITIES.find((n) => n.value === val);
  return found ? (ar ? found.ar : found.en) : val;
}
