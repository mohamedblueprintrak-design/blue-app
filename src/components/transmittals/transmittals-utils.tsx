import { Mail, UserCheck, Truck, ArrowRight, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ===== Types =====
export interface TransmittalItem {
  id: string;
  projectId: string;
  number: string;
  subject: string;
  fromId: string;
  toName: string;
  toEmail: string;
  toCompany: string;
  toPhone: string;
  deliveryMethod: string;
  status: string;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  from: { id: string; name: string; email: string } | null;
  items: TransmittalDetailItem[];
}

export interface TransmittalDetailItem {
  id: string;
  transmittalId: string;
  documentNumber: string;
  title: string;
  revision: string;
  copies: number;
  purpose: string;
  received: boolean;
  approved: boolean;
  rejected: boolean;
  needsRevision: boolean;
  replyNotes: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
}

// ===== Helpers =====
export function getDeliveryBadge(method: string, ar: boolean) {
  const configs: Record<string, { icon: typeof Mail; label: string; labelEn: string; color: string }> = {
    EMAIL: { icon: Mail, label: "بريد إلكتروني", labelEn: "Email", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    MANUAL: { icon: UserCheck, label: "يدوي", labelEn: "Manual", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    COURIER: { icon: Truck, label: "ساعي", labelEn: "Courier", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  };
  const cfg = configs[method] || configs.EMAIL;
  const Icon = cfg.icon;
  return (
    <Badge variant="secondary" className={`text-[10px] h-5 gap-1 ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {ar ? cfg.label : cfg.labelEn}
    </Badge>
  );
}

export function getStatusBadge(status: string, ar: boolean) {
  const configs: Record<string, { label: string; labelEn: string; gradient: string }> = {
    SENT: { label: "مرسل", labelEn: "Sent", gradient: "bg-gradient-to-r from-blue-500 to-blue-600" },
    RECEIVED: { label: "مستلم", labelEn: "Received", gradient: "bg-gradient-to-r from-emerald-500 to-emerald-600" },
    REPLIED: { label: "تم الرد", labelEn: "Replied", gradient: "bg-gradient-to-r from-amber-500 to-amber-600" },
    CLOSED: { label: "مغلق", labelEn: "Closed", gradient: "bg-gradient-to-r from-slate-400 to-slate-500" },
  };
  const cfg = configs[status] || configs.SENT;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-white px-2 py-0.5 rounded-full ${cfg.gradient}`}>
      {status === "SENT" && <ArrowRight className={cn("h-3 w-3", ar && "rotate-180")} />}
      {status === "RECEIVED" && <ArrowLeft className={cn("h-3 w-3", ar && "rotate-180")} />}
      {status === "REPLIED" && <CheckCircle2 className="h-3 w-3" />}
      {status === "CLOSED" && <XCircle className="h-3 w-3" />}
      {ar ? cfg.label : cfg.labelEn}
    </span>
  );
}

export function getPurposeBadge(purpose: string, ar: boolean) {
  const configs: Record<string, { label: string; labelEn: string; color: string }> = {
    REVIEW: { label: "مراجعة", labelEn: "Review", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    APPROVAL: { label: "اعتماد", labelEn: "Approval", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
    INFORMATION: { label: "معلومات", labelEn: "Info", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    EXECUTION: { label: "تنفيذ", labelEn: "Execution", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  };
  const cfg = configs[purpose] || configs.REVIEW;
  return (
    <Badge variant="secondary" className={`text-[9px] h-4 px-1 ${cfg.color}`}>
      {ar ? cfg.label : cfg.labelEn}
    </Badge>
  );
}
