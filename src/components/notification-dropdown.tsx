"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLang } from "@/hooks/use-lang";
import { useNavStore } from "@/store/nav-store";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle,
  CheckSquare,
  Wallet,
  CalendarDays,
  MapPin,
  MonitorCheck,
  Building2,
  CheckCheck,
  Loader2,
  BellOff,
  Inbox,
} from "lucide-react";

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

// ===== Type Icon Configuration =====
const typeIconConfig: Record<string, {
  icon: typeof Bell;
  color: string;
  bg: string;
  dot: string;
}> = {
  PROJECT_UPDATE: {
    icon: Building2, color: "text-teal-600 dark:text-teal-400", bg: "bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/40 dark:to-teal-950/30",
    dot: "bg-teal-500",
  },
  TASK_DUE: {
    icon: CheckSquare, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-900/40 dark:to-cyan-950/30",
    dot: "bg-cyan-500",
  },
  task_assigned: {
    icon: CheckSquare, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-900/40 dark:to-cyan-950/30",
    dot: "bg-cyan-500",
  },
  task_completed: {
    icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-950/30",
    dot: "bg-emerald-500",
  },
  INVOICE_OVERDUE: {
    icon: Wallet, color: "text-amber-600 dark:text-amber-400", bg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-950/30",
    dot: "bg-amber-500",
  },
  APPROVAL_NEEDED: {
    icon: Bell, color: "text-violet-600 dark:text-violet-400", bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-950/30",
    dot: "bg-violet-500",
  },
  approval_status: {
    icon: CheckCircle, color: "text-violet-600 dark:text-violet-400", bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-950/30",
    dot: "bg-violet-500",
  },
  meeting_reminder: {
    icon: CalendarDays, color: "text-violet-600 dark:text-violet-400", bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-950/30",
    dot: "bg-violet-500",
  },
  site_visit: {
    icon: MapPin, color: "text-teal-600 dark:text-teal-400", bg: "bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/40 dark:to-teal-950/30",
    dot: "bg-teal-500",
  },
  system: {
    icon: MonitorCheck, color: "text-slate-600 dark:text-slate-400", bg: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-900/30",
    dot: "bg-slate-400",
  },
};

const defaultConfig = {
  icon: Bell, color: "text-slate-500 dark:text-slate-400", bg: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-900/30",
  dot: "bg-slate-400",
};

// ===== Format time ago =====
function formatTimeAgo(dateStr: string, isAr: boolean): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return isAr ? "الآن" : "Just now";
  if (diffMin < 60) {
    return isAr
      ? (diffMin === 1 ? "منذ دقيقة" : `منذ ${diffMin} دقائق`)
      : (diffMin === 1 ? "1m ago" : `${diffMin}m ago`);
  }
  if (diffHours < 24) {
    return isAr
      ? (diffHours === 1 ? "منذ ساعة" : `منذ ${diffHours} ساعة`)
      : (diffHours === 1 ? "1h ago" : `${diffHours}h ago`);
  }
  if (diffDays === 1) return isAr ? "أمس" : "yesterday";
  if (diffDays < 7) {
    return isAr
      ? (diffDays === 2 ? "منذ يومين" : `منذ ${diffDays} أيام`)
      : `${diffDays}d ago`;
  }
  return date.toLocaleDateString(isAr ? "ar-AE" : "en-US", { month: "short", day: "numeric" });
}

// ===== Main Component =====
export default function NotificationDropdown() {
  const lang = useLang();
  const isAr = lang === "ar";
  const queryClient = useQueryClient();
  const setCurrentPage = useNavStore((s) => s.setCurrentPage);
  const setCurrentProjectId = useNavStore((s) => s.setCurrentProjectId);
  const [open, setOpen] = useState(false);

  // Fetch notifications
  const { data, isLoading } = useQuery<{
    notifications: NotificationRecord[];
    unreadCount: number;
  }>({
    queryKey: ["notifications-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=5");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: open,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Fetch unread count (always running for badge)
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["notification-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count");
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const liveUnreadCount = countData?.count ?? unreadCount;

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
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
    },
  });

  // Handle notification click
  const handleNotificationClick = (notif: NotificationRecord) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.relatedEntityType && notif.relatedEntityId) {
      const navMap: Record<string, { page: string; id?: string }> = {
        project: { page: "projects", id: notif.relatedEntityId },
        task: { page: "tasks" },
        invoice: { page: "financial-invoices" },
        APPROVAL: { page: "tasks" },
        MEETING: { page: "meetings" },
        document: { page: "documents" },
        rfi: { page: "site-rfi" },
        submittal: { page: "site-submittals" },
      };
      const nav = navMap[notif.relatedEntityType];
      if (nav) {
        setCurrentPage(nav.page);
        if (nav.id) {
          setCurrentProjectId(nav.id);
        }
      }
    }
    setOpen(false);
  };

  const handleViewAll = () => {
    setCurrentPage("notifications");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {liveUnreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-slate-900 notif-badge-pulse">
              {liveUnreadCount > 99 ? "99+" : liveUnreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={isAr ? "start" : "end"}
        side="bottom"
        sideOffset={8}
        className={cn(
          "w-80 sm:w-96 p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/60 rounded-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50/50 dark:from-teal-950/30 dark:to-cyan-950/20 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/20">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {isAr ? "الإشعارات" : "Notifications"}
              </h3>
              {liveUnreadCount > 0 && (
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                  {liveUnreadCount} {isAr ? "جديد" : "NEW"}
                </p>
              )}
            </div>
          </div>
          {liveUnreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/30"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin me-1" />
              ) : (
                <CheckCheck className="h-3 w-3 me-1" />
              )}
              {isAr ? "قراءة الكل" : "Read all"}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-3 w-1/2 rounded bg-slate-50 dark:bg-slate-800/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-3">
                <BellOff className="h-7 w-7 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isAr ? "لا توجد إشعارات" : "No notifications"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {isAr ? "أنت محدّث بالكامل" : "You&apos;re all caught up"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              <AnimatePresence mode="popLayout">
                {notifications.map((notif, index) => {
                  const config = typeIconConfig[notif.type] || defaultConfig;
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={notif.id}
                      role="button"
                      tabIndex={0}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: isAr ? 100 : -100 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-150 group",
                        notif.isRead
                          ? "hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                          : "bg-teal-50/30 dark:bg-teal-950/10 hover:bg-teal-50/50 dark:hover:bg-teal-950/20"
                      )}
                      onClick={() => handleNotificationClick(notif)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notif); }}
                    >
                      {/* Icon with gradient background */}
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                        config.bg
                      )}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-[13px] font-medium leading-snug line-clamp-1",
                            notif.isRead
                              ? "text-slate-600 dark:text-slate-400"
                              : "text-slate-900 dark:text-white font-semibold"
                          )}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="relative flex h-2 w-2 shrink-0 mt-1.5">
                              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.dot)} />
                              <span className={cn("relative inline-flex rounded-full h-2 w-2", config.dot)} />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                          {formatTimeAgo(notif.createdAt, isAr)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer - View All */}
        {notifications.length > 0 && (
          <>
            <Separator className="opacity-60" />
            <button
              onClick={handleViewAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
            >
              <Inbox className="h-3.5 w-3.5" />
              {isAr ? "عرض الكل" : "View all notifications"}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
