import { Clock, CheckCircle2, XCircle, Send, FileText } from "lucide-react";

export const STATUS_CONFIG: Record<string, { label: string; labelEn: string; color: string; icon: typeof Clock }> = {
  DRAFT: {
    label: "\u0645\u0633\u0648\u062f\u0629",
    labelEn: "Draft",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: FileText,
  },
  SUBMITTED: {
    label: "\u0645\u0642\u062f\u0645\u0629",
    labelEn: "Submitted",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    icon: Send,
  },
  APPROVED: {
    label: "\u0645\u0639\u062a\u0645\u062f\u0629",
    labelEn: "Approved",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "\u0645\u0631\u0641\u0648\u0636\u0629",
    labelEn: "Rejected",
    color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    icon: XCircle,
  },
};

export const TASK_TYPES = [
  { value: "regular", labelAr: "\u0639\u0627\u062f\u064a", labelEn: "Regular" },
  { value: "overtime", labelAr: "\u0625\u0636\u0627\u0641\u064a", labelEn: "Overtime" },
  { value: "holiday", labelAr: "\u0639\u0637\u0644\u0629", labelEn: "Holiday" },
];

export const DAYS_AR = ["\u0627\u0644\u0627\u062b\u0646\u064a\u0646", "\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621", "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", "\u0627\u0644\u062e\u0645\u064a\u0633", "\u0627\u0644\u062c\u0645\u0639\u0629", "\u0627\u0644\u0633\u0628\u062a", "\u0627\u0644\u0623\u062d\u062f"];
export const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
