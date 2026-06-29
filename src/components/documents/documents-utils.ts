import { Folder, FileText } from 'lucide-react';

// ===== Types =====
export interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  category: string;
  version: number;
  filePath: string;
  projectId: string | null;
  contractId: string | null;
  uploadedById: string | null;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  contract: { id: string; number: string; title: string } | null;
  uploader: { id: string; name: string; avatar: string } | null;
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

// ===== Helpers =====
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// File type icons with distinct colors per the spec
export function getFileTypeConfig(fileType: string) {
  const ext = (fileType || "").toLowerCase();
  if (ext === "pdf") return { icon: FileText, label: "PDF", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", border: "border-red-200 dark:border-red-800/40" };
  if (["doc", "docx"].includes(ext)) return { icon: FileText, label: "DOC", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800/40" };
  if (["xls", "xlsx"].includes(ext)) return { icon: FileText, label: "XLS", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800/40" };
  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) return { icon: FileText, label: "IMG", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30", border: "border-violet-200 dark:border-violet-800/40" };
  if (["dwg", "dxf"].includes(ext)) return { icon: FileText, label: "DWG", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800/40" };
  return { icon: FileText, label: ext.toUpperCase().slice(0, 4) || "FILE", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700/40" };
}

export function getCategoryConfig(cat: string) {
  const configs: Record<string, { ar: string; en: string; color: string; icon: string }> = {
    general: { ar: "عام", en: "General", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: "📂" },
    contract: { ar: "عقد", en: "Contract", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", icon: "📋" },
    drawings: { ar: "مخططات", en: "Drawings", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", icon: "📐" },
    report: { ar: "تقرير", en: "Report", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", icon: "📊" },
    invoice: { ar: "فاتورة", en: "Invoice", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", icon: "🧾" },
    transmittal: { ar: "إحالة", en: "Transmittal", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300", icon: "📨" },
    specs: { ar: "مواصفات", en: "Specs", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", icon: "🔧" },
    calculations: { ar: "حسابات", en: "Calcs", color: "bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/50 dark:text-brand-navy-300", icon: "🔢" },
    photos: { ar: "صور", en: "Photos", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300", icon: "📷" },
  };
  return configs[cat] || configs.general;
}

// Folder tree categories
export const folderCategories = [
  { key: "all", ar: "كل الملفات", en: "All Files", icon: Folder },
  { key: "drawings", ar: "المخططات", en: "Drawings", icon: Folder },
  { key: "contract", ar: "العقود", en: "Contracts", icon: Folder },
  { key: "specs", ar: "المواصفات", en: "Specifications", icon: Folder },
  { key: "report", ar: "التقارير", en: "Reports", icon: Folder },
  { key: "calculations", ar: "الحسابات", en: "Calculations", icon: Folder },
  { key: "invoice", ar: "الفواتير", en: "Invoices", icon: Folder },
  { key: "transmittal", ar: "الإحالات", en: "Transmittals", icon: Folder },
  { key: "photos", ar: "الصور", en: "Photos", icon: Folder },
  { key: "general", ar: "عام", en: "General", icon: Folder },
];

// Sort button options
export const sortButtonOptions = [
  { key: "name", ar: "الاسم", en: "Name", defaultDir: "asc" as const },
  { key: "date", ar: "التاريخ", en: "Date", defaultDir: "desc" as const },
  { key: "size", ar: "الحجم", en: "Size", defaultDir: "desc" as const },
  { key: "type", ar: "النوع", en: "Type", defaultDir: "asc" as const },
];
