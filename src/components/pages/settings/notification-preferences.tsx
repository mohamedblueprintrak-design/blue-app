"use client";


import { useTranslations } from 'next-intl';
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  ListTodo,
  ChevronDown,
  ChevronLeft,
  FileText,
  FolderKanban,
  MessageSquare,
  Monitor,
  Moon,
  Shield,
  Save,
  Clock,
  Mail,
  Smartphone,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────

interface Channels {
  inApp: boolean;
  email: boolean;
  push: boolean;
  webhook: boolean;
}

interface CategoryEvents {
  [key: string]: boolean;
}

interface Categories {
  invoices: CategoryEvents;
  tasks: CategoryEvents;
  projects: CategoryEvents;
  approvals: CategoryEvents;
  documents: CategoryEvents;
  comments: CategoryEvents;
  system: CategoryEvents;
}

interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

interface NotificationPreferencesProps {
  isAr: boolean;
}

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_CHANNELS: Channels = {
  inApp: true,
  email: true,
  push: true,
  webhook: false,
};

const DEFAULT_CATEGORIES: Categories = {
  invoices: { created: true, paid: true, overdue: true },
  tasks: { assigned: true, due_soon: true, overdue: true, completed: true },
  projects: { created: true, status_change: true },
  approvals: { pending: true, approved: true, rejected: true },
  documents: { uploaded: true, signed: true },
  comments: { mentioned: true, replied: true },
  system: { security_alerts: true, billing: true },
};

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: "22:00",
  end: "08:00",
  timezone: "Asia/Dubai",
};

const TIMEZONES = [
  { value: "Asia/Dubai", label: "توقيت الخليج (GST)", labelEn: "Gulf Standard Time (GST)" },
  { value: "Asia/Riyadh", label: "توقيت الرياض", labelEn: "Riyadh Time" },
  { value: "Asia/Kuwait", label: "توقيت الكويت", labelEn: "Kuwait Time" },
  { value: "Asia/Qatar", label: "توقيت قطر", labelEn: "Qatar Time" },
  { value: "Asia/Bahrain", label: "توقيت البحرين", labelEn: "Bahrain Time" },
  { value: "Asia/Muscat", label: "توقيت مسقط", labelEn: "Muscat Time" },
  { value: "Asia/Baghdad", label: "توقيت بغداد", labelEn: "Baghdad Time" },
  { value: "Asia/Beirut", label: "توقيت بيروت", labelEn: "Beirut Time" },
  { value: "Asia/Cairo", label: "توقيت القاهرة", labelEn: "Cairo Time" },
  { value: "Europe/London", label: "توقيت لندن (GMT)", labelEn: "London Time (GMT)" },
  { value: "Europe/Berlin", label: "توقيت برلين (CET)", labelEn: "Berlin Time (CET)" },
  { value: "America/New_York", label: "توقيت نيويورك (EST)", labelEn: "New York Time (EST)" },
];

// ── Category config ────────────────────────────────────────────────────────

interface CategoryConfig {
  key: keyof Categories;
  titleAr: string;
  titleEn: string;
  icon: typeof Bell;
  color: string;
  eventLabels: Record<string, { ar: string; en: string }>;
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "invoices",
    titleAr: "الفواتير",
    titleEn: "Invoices",
    icon: FileText,
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    eventLabels: {
      created: { ar: "إنشاء فاتورة", en: "Invoice Created" },
      paid: { ar: "دفعت الفاتورة", en: "Invoice Paid" },
      overdue: { ar: "فاتورة متأخرة", en: "Invoice Overdue" },
    },
  },
  {
    key: "tasks",
    titleAr: "المهام",
    titleEn: "Tasks",
    icon: ListTodo,
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    eventLabels: {
      assigned: { ar: "تعيين مهمة", en: "Task Assigned" },
      due_soon: { ar: "مهمة قريبة الاستحقاق", en: "Task Due Soon" },
      overdue: { ar: "مهمة متأخرة", en: "Task Overdue" },
      completed: { ar: "مهمة مكتملة", en: "Task Completed" },
    },
  },
  {
    key: "projects",
    titleAr: "المشاريع",
    titleEn: "Projects",
    icon: FolderKanban,
    color: "bg-brand-navy-100 dark:bg-brand-navy-900/30 text-brand-navy-600 dark:text-brand-navy-400",
    eventLabels: {
      created: { ar: "مشروع جديد", en: "Project Created" },
      status_change: { ar: "تغيير حالة المشروع", en: "Project Status Change" },
    },
  },
  {
    key: "approvals",
    titleAr: "الموافقات",
    titleEn: "Approvals",
    icon: Shield,
    color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    eventLabels: {
      pending: { ar: "موافقة معلقة", en: "Pending Approval" },
      approved: { ar: "تمت الموافقة", en: "Approved" },
      rejected: { ar: "مرفوض", en: "Rejected" },
    },
  },
  {
    key: "documents",
    titleAr: "المستندات",
    titleEn: "Documents",
    icon: FileText,
    color: "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400",
    eventLabels: {
      uploaded: { ar: "مستند مرفوع", en: "Document Uploaded" },
      signed: { ar: "مستند موقّع", en: "Document Signed" },
    },
  },
  {
    key: "comments",
    titleAr: "التعليقات",
    titleEn: "Comments",
    icon: MessageSquare,
    color: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
    eventLabels: {
      mentioned: { ar: "إشارة إليك", en: "You Were Mentioned" },
      replied: { ar: "رد على تعليقك", en: "Reply to Your Comment" },
    },
  },
  {
    key: "system",
    titleAr: "النظام",
    titleEn: "System",
    icon: Monitor,
    color: "bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400",
    eventLabels: {
      security_alerts: { ar: "تنبيهات أمنية", en: "Security Alerts" },
      billing: { ar: "إشعارات الفوترة", en: "Billing Notifications" },
    },
  },
];

// ── Channel config ─────────────────────────────────────────────────────────

interface ChannelConfig {
  key: keyof Channels;
  titleAr: string;
  titleEn: string;
  icon: typeof Bell;
  color: string;
}

const CHANNEL_CONFIG: ChannelConfig[] = [
  {
    key: "inApp",
    titleAr: "داخل التطبيق",
    titleEn: "In-App",
    icon: Monitor,
    color: "bg-brand-navy-100 dark:bg-brand-navy-900/30 text-brand-navy-600 dark:text-brand-navy-400",
  },
  {
    key: "email",
    titleAr: "البريد الإلكتروني",
    titleEn: "Email",
    icon: Mail,
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    key: "push",
    titleAr: "إشعارات فورية",
    titleEn: "Push Notifications",
    icon: Smartphone,
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "webhook",
    titleAr: "Webhook",
    titleEn: "Webhook",
    icon: Webhook,
    color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function NotificationPreferences({ isAr }: NotificationPreferencesProps) {
  const tAuto = useTranslations();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channels>(DEFAULT_CHANNELS);
  const [categories, setCategories] = useState<Categories>(DEFAULT_CATEGORIES);
  const [quietHours, setQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Fetch preferences on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/settings/notifications");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setChannels(data.channels ?? DEFAULT_CHANNELS);
          setCategories(data.categories ?? DEFAULT_CATEGORIES);
          setQuietHours(data.quietHours ?? DEFAULT_QUIET_HOURS);
        }
      } catch {
        // Silently use defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels, categories, quietHours }),
      });
      if (res.ok) {
        toast({
          title: tAuto('auto.saved'),
          description: tAuto('auto.notificationPreferencesSavedSuccessfully'),
        });
      } else {
        toast({
          title: tAuto('auto.error'),
          description: tAuto('auto.failedToSavePreferences'),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: tAuto('auto.error'),
        description: tAuto('auto.failedToConnectToServer'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle a channel
  const toggleChannel = (key: keyof Channels, value: boolean) => {
    setChannels((prev) => ({ ...prev, [key]: value }));
  };

  // Toggle a category event
  const toggleCategoryEvent = (categoryKey: keyof Categories, eventKey: string, value: boolean) => {
    setCategories((prev) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [eventKey]: value,
      },
    }));
  };

  // Toggle all events in a category
  const toggleAllCategory = (categoryKey: keyof Categories, value: boolean) => {
    setCategories((prev) => ({
      ...prev,
      [categoryKey]: Object.fromEntries(
        Object.keys(prev[categoryKey]).map((k) => [k, value])
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {/* ── Channels ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={Bell}
            title={tAuto('auto.notificationChannels')}
            subtitle={tAuto('auto.chooseHowYouWantToReceiveNotifications')}
          />

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {CHANNEL_CONFIG.map((ch) => (
                <div
                  key={ch.key}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", ch.color)}>
                      <ch.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {isAr ? ch.titleAr : ch.titleEn}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={channels[ch.key]}
                    onCheckedChange={(checked) => toggleChannel(ch.key, checked)}
                    className="data-[state=checked]:bg-brand-navy-600"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Categories ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={ListTodo}
            title={tAuto('auto.categoryPreferences')}
            subtitle={tAuto('auto.controlNotificationsForEachCategoryInDet')}
          />

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {CATEGORY_CONFIG.map((cat) => {
                const isOpen = openCategories[cat.key] ?? false;
                const allEnabled = Object.values(categories[cat.key] ?? {}).every(Boolean);
                const someEnabled = Object.values(categories[cat.key] ?? {}).some(Boolean);

                return (
                  <Collapsible
                    key={cat.key}
                    open={isOpen}
                    onOpenChange={(open) =>
                      setOpenCategories((prev) => ({ ...prev, [cat.key]: open }))
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-start"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cat.color)}>
                            <cat.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {isAr ? cat.titleAr : cat.titleEn}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {allEnabled
                                ? tAuto('auto.allNotificationsEnabled')
                                : someEnabled
                                  ? tAuto('auto.someNotificationsEnabled')
                                  : tAuto('auto.allNotificationsDisabled')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={allEnabled}
                            onCheckedChange={(checked) => {
                              toggleAllCategory(cat.key, checked);
                            }}
                            className="data-[state=checked]:bg-brand-navy-600"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronLeft className="h-4 w-4 text-slate-400 rtl:rotate-180" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ps-14 pe-4 pt-2 pb-3 space-y-2">
                        {Object.entries(cat.eventLabels).map(([eventKey, labels]) => (
                          <div
                            key={eventKey}
                            className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                          >
                            <Label className="text-sm text-slate-700 dark:text-slate-300 font-normal">
                              {isAr ? labels.ar : labels.en}
                            </Label>
                            <Switch
                              checked={categories[cat.key]?.[eventKey] ?? true}
                              onCheckedChange={(checked) =>
                                toggleCategoryEvent(cat.key, eventKey, checked)
                              }
                              className="data-[state=checked]:bg-brand-navy-600"
                            />
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quiet Hours ──────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={Moon}
            title={tAuto('auto.quietHours')}
            subtitle={tAuto('auto.muteNotificationsDuringASpecifiedPeriod')}
          />

          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {tAuto('auto.enableQuietHours')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tAuto('auto.noNotificationsWillBeSentDuringThisPerio')}
                  </p>
                </div>
              </div>
              <Switch
                checked={quietHours.enabled}
                onCheckedChange={(checked) =>
                  setQuietHours((prev) => ({ ...prev, enabled: checked }))
                }
                className="data-[state=checked]:bg-brand-navy-600"
              />
            </div>

            {/* Time & Timezone selectors */}
            {quietHours.enabled && (
              <div className="ps-4 pe-2 space-y-4 border-s-2 border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {tAuto('auto.startTime')}
                    </Label>
                    <Input
                      type="time"
                      value={quietHours.start}
                      onChange={(e) =>
                        setQuietHours((prev) => ({ ...prev, start: e.target.value }))
                      }
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>

                  {/* End time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {tAuto('auto.endTime')}
                    </Label>
                    <Input
                      type="time"
                      value={quietHours.end}
                      onChange={(e) =>
                        setQuietHours((prev) => ({ ...prev, end: e.target.value }))
                      }
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {tAuto('auto.timezone')}
                  </Label>
                  <Select
                    value={quietHours.timezone}
                    onValueChange={(value) =>
                      setQuietHours((prev) => ({ ...prev, timezone: value }))
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {isAr ? tz.label : tz.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Save Button ──────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white min-w-[120px]"
        >
          {saving ? (
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
          ) : (
            <>
              <Save className="h-4 w-4 me-2" />
              {tAuto('auto.savePreferences')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
