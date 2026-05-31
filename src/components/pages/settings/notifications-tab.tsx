"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Building2,
  Clock,
  CreditCard,
  MapPin,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { NotificationSettings } from "./types";

interface NotificationsTabProps {
  isAr: boolean;
  notifSettings: NotificationSettings;
  notifSaving: boolean;
  handleNotifToggle: (key: string, checked: boolean) => void;
}

export function NotificationsTab({
  isAr,
  notifSettings,
  notifSaving,
  handleNotifToggle,
}: NotificationsTabProps) {
  const notificationItems = [
    {
      key: "projectUpdates" as const,
      title: isAr ? "تحديثات المشاريع" : "Project Updates",
      desc: isAr
        ? "إشعارات عند تغيير حالة المشروع أو التقدم"
        : "Notifications when project status or progress changes",
      icon: Building2,
      color: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    },
    {
      key: "taskDeadlines" as const,
      title: isAr ? "مواعيد المهام النهائية" : "Task Deadlines",
      desc: isAr
        ? "تذكيرات قبل تواريخ استحقاق المهام"
        : "Reminders before task due dates",
      icon: Clock,
      color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    },
    {
      key: "invoiceReminders" as const,
      title: isAr ? "تذكيرات الفواتير" : "Invoice Reminders",
      desc: isAr
        ? "تنبيهات عند اقتراب مواعيد استحقاق الفواتير"
        : "Alerts when invoice due dates approach",
      icon: CreditCard,
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    },
    {
      key: "meetingReminders" as const,
      title: isAr ? "تذكيرات الاجتماعات" : "Meeting Reminders",
      desc: isAr
        ? "تذكيرات قبل الاجتماعات المجدولة"
        : "Reminders before scheduled meetings",
      icon: MapPin,
      color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    },
    {
      key: "siteVisitAlerts" as const,
      title: isAr ? "تنبيهات زيارات الموقع" : "Site Visit Alerts",
      desc: isAr
        ? "إشعارات عند جدولة زيارات موقع جديدة"
        : "Notifications when new site visits are scheduled",
      icon: Smartphone,
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <SectionHeader
          icon={Bell}
          title={isAr ? "تفضيلات الإشعارات" : "Notification Preferences"}
          subtitle={isAr ? "اختر الإشعارات التي تريد استلامها" : "Choose which notifications you want to receive"}
        />

        <div className="space-y-3">
          {notificationItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.color)}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notifSaving && (
                  <span className="h-3 w-3 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                )}
                <Switch
                  checked={notifSettings[item.key]}
                  onCheckedChange={(checked) =>
                    handleNotifToggle(item.key, checked)
                  }
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
