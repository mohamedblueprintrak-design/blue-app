"use client";


import { useTranslations } from 'next-intl';
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { useNavStore } from "@/store/nav-store";
import { Bell, CheckCircle, Clock, CalendarDays, MapPin, CheckCheck, Loader2, Building2, CheckSquare, Wallet, X, Eye, BellOff, MonitorCheck, Layers, ArrowRight, PartyPopper, FolderKanban } from 'lucide-react'

// ===== Types =====
interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityType: string;
  relatedEntityId: string;
  createdAt: string;
}

// ===== Type Configuration =====
const typeConfig: Record<string, {
  icon: typeof Bell;
  color: string;
  bg: string;
  dot: string;
  ar: string;
  en: string;
  tab: string;
  borderColor: string;
}> = {
  PROJECT_UPDATE: {
    icon: Building2, color: "text-brand-navy-600 dark:text-brand-navy-400",
    bg: "bg-gradient-to-br from-brand-navy-100 to-brand-navy-50 dark:from-brand-navy-900/40 dark:to-brand-navy-950/30",
    dot: "bg-brand-navy-500", ar: "تحديث مشروع", en: "Project Update", tab: "projects",
    borderColor: "border-s-brand-navy-400 dark:border-s-brand-navy-600",
  },
  TASK_DUE: {
    icon: CheckSquare, color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-900/40 dark:to-cyan-950/30",
    dot: "bg-cyan-500", ar: "مهمة مستحقة", en: "Task Due", tab: "tasks",
    borderColor: "border-s-cyan-400 dark:border-s-cyan-600",
  },
  task_assigned: {
    icon: CheckSquare, color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-900/40 dark:to-cyan-950/30",
    dot: "bg-cyan-500", ar: "تعيين مهمة", en: "Task Assigned", tab: "tasks",
    borderColor: "border-s-cyan-400 dark:border-s-cyan-600",
  },
  task_completed: {
    icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-950/30",
    dot: "bg-emerald-500", ar: "إتمام مهمة", en: "Task Completed", tab: "tasks",
    borderColor: "border-s-emerald-400 dark:border-s-emerald-600",
  },
  INVOICE_OVERDUE: {
    icon: Wallet, color: "text-amber-600 dark:text-amber-400",
    bg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-950/30",
    dot: "bg-amber-500", ar: "فاتورة متأخرة", en: "Invoice Overdue", tab: "finance",
    borderColor: "border-s-amber-400 dark:border-s-amber-600",
  },
  APPROVAL_NEEDED: {
    icon: Bell, color: "text-violet-600 dark:text-violet-400",
    bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-950/30",
    dot: "bg-violet-500", ar: "موافقة مطلوبة", en: "Approval Needed", tab: "projects",
    borderColor: "border-s-violet-400 dark:border-s-violet-600",
  },
  approval_status: {
    icon: CheckCircle, color: "text-violet-600 dark:text-violet-400",
    bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-950/30",
    dot: "bg-violet-500", ar: "حالة موافقة", en: "Approval Status", tab: "projects",
    borderColor: "border-s-violet-400 dark:border-s-violet-600",
  },
  meeting_reminder: {
    icon: CalendarDays, color: "text-rose-600 dark:text-rose-400",
    bg: "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-900/40 dark:to-rose-950/30",
    dot: "bg-rose-500", ar: "تذكير اجتماع", en: "Meeting Reminder", tab: "all",
    borderColor: "border-s-rose-400 dark:border-s-rose-600",
  },
  site_visit: {
    icon: MapPin, color: "text-brand-navy-600 dark:text-brand-navy-400",
    bg: "bg-gradient-to-br from-brand-navy-100 to-brand-navy-50 dark:from-brand-navy-900/40 dark:to-brand-navy-950/30",
    dot: "bg-brand-navy-500", ar: "زيارة موقع", en: "Site Visit", tab: "projects",
    borderColor: "border-s-brand-navy-400 dark:border-s-brand-navy-600",
  },
  system: {
    icon: MonitorCheck, color: "text-slate-600 dark:text-slate-400",
    bg: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-900/30",
    dot: "bg-slate-400", ar: "نظام", en: "System", tab: "system",
    borderColor: "border-s-slate-300 dark:border-s-slate-600",
  },
};

// Enhanced tabs with new categories
const tabConfig: Record<string, { types: string[]; ar: string; en: string; icon: typeof Bell }> = {
  all: { types: [], ar: "الكل", en: "All", icon: Layers },
  unread: { types: [], ar: "غير مقروء", en: "Unread", icon: Eye },
  tasks: { types: ["TASK_DUE", "task_assigned", "task_completed"], ar: "مهام", en: "Tasks", icon: CheckSquare },
  projects: { types: ["PROJECT_UPDATE", "APPROVAL_NEEDED", "approval_status", "site_visit"], ar: "مشاريع", en: "Projects", icon: FolderKanban },
  finance: { types: ["INVOICE_OVERDUE"], ar: "مالية", en: "Finance", icon: Wallet },
  system: { types: ["system"], ar: "النظام", en: "System", icon: MonitorCheck },
};

// ===== Main Component =====
interface Props {
  language?: "ar" | "en";
  projectId?: string;
}

export default function NotificationsPage({ projectId }: Props) {
  const tAuto = useTranslations();
  const lang = useLang();
  const isAr = lang === "ar";
  const queryClient = useQueryClient();
  const setCurrentPage = useNavStore((s) => s.setCurrentPage);
  const setCurrentProjectId = useNavStore((s) => s.setCurrentProjectId);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [confirmMarkAll, setConfirmMarkAll] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Fetch notifications
  const { data, isLoading } = useQuery<{
    notifications: NotificationRecord[];
    unreadCount: number;
  }>({
    queryKey: ["notifications", projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const rawNotifications = useMemo(() => data?.notifications || [], [data?.notifications]);
  const unreadCount = data?.unreadCount || 0;

  // Fetch unread count separately for header badge
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["notification-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const liveUnreadCount = countData?.count ?? unreadCount;

  // Apply tab filtering
  const notifications = useMemo(() => {
    const tab = tabConfig[activeTab];
    if (!tab) return rawNotifications;

    if (activeTab === "unread") {
      return rawNotifications.filter((n) => !n.isRead);
    }
    if (activeTab === "all") {
      return rawNotifications;
    }
    return rawNotifications.filter((n) => tab.types.includes(n.type));
  }, [rawNotifications, activeTab]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rawNotifications.length, unread: rawNotifications.filter((n) => !n.isRead).length };
    Object.entries(tabConfig).forEach(([key, cfg]) => {
      if (key !== "all" && key !== "unread") {
        counts[key] = rawNotifications.filter((n) => cfg.types.includes(n.type)).length;
      }
    });
    return counts;
  }, [rawNotifications]);

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/notifications", {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ id }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetch("/api/notifications", {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ markAllRead: true }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
      setConfirmMarkAll(false);
    },
  });

  // Delete single notification
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/notifications/${id}`, { method: "DELETE", headers: getMutationHeaders() }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  // Navigate to related entity
  const handleNotificationClick = (notif: NotificationRecord) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.relatedEntityType && notif.relatedEntityId) {
      const navMap: Record<string, { page: string; id?: string }> = {
        project: { page: "projects", id: notif.relatedEntityId },
        task: { page: "tasks" },
        invoice: { page: "financial-invoices" },
        APPROVAL: { page: "approvals" },
        MEETING: { page: "meetings" },
        document: { page: "documents" },
        rfi: { page: "site-rfi" },
        submittal: { page: "site-submittals" },
        contract: { page: "contracts" },
        payment: { page: "financial-payments" },
        defect: { page: "site-defects" },
        siteVisit: { page: "site-visits" },
        leave: { page: "hr-leave" },
      };
      const nav = navMap[notif.relatedEntityType];
      if (nav) {
        setCurrentPage(nav.page);
        if (nav.id) {
          setCurrentProjectId(nav.id);
        }
      }
    }
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return tAuto('auto.justNow');
    if (diffMin < 60) {
      return isAr
        ? (diffMin === 1 ? "منذ دقيقة" : `منذ ${diffMin} دقائق`)
        : (diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`);
    }
    if (diffHours < 24) {
      return isAr
        ? (diffHours === 1 ? "منذ ساعة" : `منذ ${diffHours} ساعة`)
        : (diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`);
    }
    if (diffDays === 1) return tAuto('auto.yesterday');
    if (diffDays < 7) {
      return isAr
        ? (diffDays === 2 ? "منذ يومين" : `منذ ${diffDays} أيام`)
        : `${diffDays} days ago`;
    }
    return date.toLocaleDateString(isAr ? "ar-AE" : "en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-9 flex-1 rounded-lg" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border animate-pulse">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header with notification count badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-brand-navy-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-navy-500/20">
            <Bell className="h-5 w-5 text-white" />
            {liveUnreadCount > 0 && (
              <span className="absolute -top-1 -end-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                {liveUnreadCount > 99 ? "99+" : liveUnreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {tAuto('auto.notifications')}
              {liveUnreadCount > 0 && (
                <Badge className="h-5 px-1.5 text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40">
                  {liveUnreadCount}
                </Badge>
              )}
            </h2>
            {rawNotifications.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? `${rawNotifications.length} إشعار في المجموع`
                  : `${rawNotifications.length} total notifications`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {liveUnreadCount > 0 && (
            <Button
              size="sm"
              onClick={() => {
                if (confirmMarkAll) {
                  markAllReadMutation.mutate();
                } else {
                  setConfirmMarkAll(true);
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                  timeoutRef.current = setTimeout(() => setConfirmMarkAll(false), 3000);
                }
              }}
              disabled={markAllReadMutation.isPending}
              className={cn(
                "gap-1.5 text-xs h-9 px-4 text-white border-0 shadow-md transition-all",
                confirmMarkAll
                  ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-red-500/20"
                  : "bg-gradient-to-r from-brand-navy-600 to-cyan-600 hover:from-brand-navy-700 hover:to-cyan-700 shadow-brand-navy-500/20"
              )}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              {confirmMarkAll
                ? tAuto('auto.confirm1')
                : isAr
                  ? `تعيين الكل كمقروء (${liveUnreadCount})`
                  : `Mark All Read (${liveUnreadCount})`}
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Filter Tabs */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5 overflow-x-auto">
        {Object.entries(tabConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isActive = activeTab === key;
          const count = tabCounts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-brand-navy-600 dark:text-brand-navy-400" : "")} />
              {isAr ? cfg.ar : cfg.en}
              {count > 0 && (
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  isActive
                    ? "bg-brand-navy-100 dark:bg-brand-navy-900/50 text-brand-navy-700 dark:text-brand-navy-300"
                    : key === "unread"
                      ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="p-12 text-center border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-gradient-to-br from-brand-navy-50 to-cyan-50 dark:from-brand-navy-950/20 dark:to-cyan-950/10 opacity-60" />
            <div className="absolute -bottom-10 -start-10 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-50 to-brand-navy-50 dark:from-cyan-950/20 dark:to-brand-navy-950/10 opacity-60" />
          </div>

          <div className="relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-navy-50 via-cyan-50 to-brand-navy-50 dark:from-brand-navy-900/30 dark:via-cyan-900/20 dark:to-brand-navy-900/30 flex items-center justify-center mx-auto mb-4 shadow-sm">
              {activeTab === "unread" ? (
                <PartyPopper className="h-10 w-10 text-brand-navy-400 dark:text-brand-navy-500" />
              ) : (
                <BellOff className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {activeTab === "unread"
                ? (tAuto('auto.allCaughtUp'))
                : (tAuto('auto.noNotifications'))}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {activeTab === "unread"
                ? (tAuto('auto.allNotificationsHaveBeenReadYouReAllCaug'))
                : activeTab === "all"
                  ? (tAuto('auto.noNotificationsRightNowWeLlNotifyYouOfAn'))
                  : (isAr ? `لا توجد إشعارات في فئة "${isAr ? tabConfig[activeTab]?.ar : tabConfig[activeTab]?.en}".` : `No notifications in "${tabConfig[activeTab]?.en}" category.`)
              }
            </p>
            {activeTab !== "all" && activeTab !== "unread" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs border-brand-navy-200 dark:border-brand-navy-800 text-brand-navy-600 dark:text-brand-navy-400 hover:bg-brand-navy-50 dark:hover:bg-brand-navy-950/30"
                onClick={() => setActiveTab("all")}
              >
                <Layers className="h-3.5 w-3.5 me-1.5" />
                {tAuto('auto.viewAllNotifications')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-14rem)]">
          <div className="space-y-2">
            {notifications.map((notif, index) => {
              const config = typeConfig[notif.type] || {
                icon: Bell, color: "text-slate-500 dark:text-slate-400",
                bg: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-900/30",
                dot: "bg-slate-400",
                ar: notif.type, en: notif.type, tab: "system",
                borderColor: "border-s-slate-300 dark:border-s-slate-600",
              };
              const Icon = config.icon;

              return (
                <div
                  key={notif.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
                >
                  <div
                    className={cn(
                      "group flex items-start gap-3 p-4 rounded-xl transition-all duration-200 cursor-pointer border",
                      notif.isRead
                        ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 hover:shadow-md hover:shadow-slate-100 dark:hover:shadow-slate-900/50"
                        : cn(
                            "bg-gradient-to-e from-brand-navy-50/50 to-white dark:from-brand-navy-950/15 dark:to-slate-900",
                            "border-s-brand-navy-200 dark:border-s-brand-navy-800",
                            "hover:shadow-md hover:shadow-brand-navy-100/50 dark:hover:shadow-brand-navy-900/20",
                            config.borderColor
                          )
                    )}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {/* Type Icon with gradient background */}
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-110",
                      config.bg
                    )}>
                      <Icon className={cn("h-4.5 w-4.5", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm leading-snug",
                          notif.isRead
                            ? "font-medium text-slate-600 dark:text-slate-400"
                            : "font-bold text-slate-900 dark:text-white"
                        )}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.dot)} />
                            <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5 ring-2 ring-white dark:ring-slate-900", config.dot)} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                        {notif.relatedEntityType && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-medium text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 rounded-md">
                            {isAr ? (typeConfig[notif.type]?.ar || notif.relatedEntityType) : (typeConfig[notif.type]?.en || notif.relatedEntityType)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {!notif.isRead && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notif.id); }}
                          className="p-1.5 rounded-lg hover:bg-brand-navy-50 dark:hover:bg-brand-navy-900/30 transition-colors"
                          title={tAuto('auto.markAsRead')}
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400 hover:text-brand-navy-500 dark:hover:text-brand-navy-400" />
                        </button>
                      )}
                      {notif.relatedEntityType && notif.relatedEntityId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNotificationClick(notif); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={tAuto('auto.open')}
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 hover:text-brand-navy-500 dark:hover:text-brand-navy-400" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={tAuto('auto.dismiss')}
                      >
                        <X className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
