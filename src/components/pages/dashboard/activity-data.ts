import {
  Plus,
  Activity,
  XCircle,
  CheckCircle2,
  FolderKanban,
  CheckSquare,
  Receipt,
  Users,
  FileText,
} from "lucide-react";
import type { DashboardData, ActivityItem } from "./types";

// ===== Activity Feed Data (API-driven) =====

export function getActivityFeed(data: DashboardData | undefined, isAr: boolean): ActivityItem[] {
  // If we have real activity data from the API, use it
  if (data?.activities && data.activities.length > 0) {
    const actionMap: Record<string, { actionAr: string; actionEn: string; icon: ActivityItem["icon"]; iconBg: string; iconColor: string; borderColor: string }> = {
      CREATE: { actionAr: "أنشأ", actionEn: "Created", icon: Plus, iconBg: "bg-brand-navy-100 dark:bg-brand-navy-950/50", iconColor: "text-brand-navy-600 dark:text-brand-navy-400", borderColor: "border-s-brand-navy-400 dark:border-s-brand-navy-600" },
      UPDATE: { actionAr: "حدّث", actionEn: "Updated", icon: Activity, iconBg: "bg-amber-100 dark:bg-amber-950/50", iconColor: "text-amber-600 dark:text-amber-400", borderColor: "border-s-amber-400 dark:border-s-amber-600" },
      DELETE: { actionAr: "حذف", actionEn: "Deleted", icon: XCircle, iconBg: "bg-red-100 dark:bg-red-950/50", iconColor: "text-red-600 dark:text-red-400", borderColor: "border-s-red-400 dark:border-s-red-600" },
      APPROVE: { actionAr: "وافق على", actionEn: "Approved", icon: CheckCircle2, iconBg: "bg-emerald-100 dark:bg-emerald-950/50", iconColor: "text-emerald-600 dark:text-emerald-400", borderColor: "border-s-emerald-400 dark:border-s-emerald-600" },
      REJECT: { actionAr: "رفض", actionEn: "Rejected", icon: XCircle, iconBg: "bg-red-100 dark:bg-red-950/50", iconColor: "text-red-600 dark:text-red-400", borderColor: "border-s-red-400 dark:border-s-red-600" },
    };
    const entityTypeMap: Record<string, { ar: string; en: string; icon: ActivityItem["icon"] }> = {
      project: { ar: "مشروع", en: "project", icon: FolderKanban },
      task: { ar: "مهمة", en: "task", icon: CheckSquare },
      invoice: { ar: "فاتورة", en: "invoice", icon: Receipt },
      client: { ar: "عميل", en: "client", icon: Users },
      document: { ar: "مستند", en: "document", icon: FileText },
    };

    return data.activities.map((a, _idx) => {
      const actionInfo = actionMap[a.action] || actionMap.update;
      const entityInfo = entityTypeMap[a.entityType] || { ar: a.entityType, en: a.entityType, icon: Activity };
      return {
        id: a.id,
        userName: a.userName || (isAr ? "مستخدم" : "User"),
        actionAr: `${actionInfo.actionAr} ${entityInfo.ar}`,
        actionEn: `${actionInfo.actionEn} a ${entityInfo.en}`,
        timestamp: a.timestamp,
        icon: entityInfo.icon,
        iconBg: actionInfo.iconBg,
        iconColor: actionInfo.iconColor,
        borderColor: actionInfo.borderColor,
      };
    });
  }

  // No activity data available from the API
  return [];
}
