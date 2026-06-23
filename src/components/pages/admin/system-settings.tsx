"use client";


import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap,
  ArrowUpRight,
  Server,
  Clock,
  Activity,
  DatabaseBackup,
  RefreshCw,
  Download,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import { useToast } from "@/hooks/use-toast";
import { type ActivityRecord, type BackupRecord, actionLabels, entityLabels, formatTime } from "./types";

// ===== Backup & Restore Tab =====
interface BackupRestoreTabProps {
  isAr: boolean;
  restoreDialogOpen: boolean;
  setRestoreDialogOpen: (open: boolean) => void;
  restoreTarget: string | null;
  setRestoreTarget: (target: string | null) => void;
}

export function BackupRestoreTab({
  isAr,
  restoreDialogOpen,
  setRestoreDialogOpen,
  restoreTarget,
  setRestoreTarget,
}: BackupRestoreTabProps) {
  const tAuto = useTranslations();
  const { toast } = useToast();

  const { data: backupData, isLoading: backupsLoading, refetch } = useQuery<{
    backups: BackupRecord[];
    stats: { totalBackups: number; totalSize: number; oldestBackup?: string; newestBackup?: string };
  }>({
    queryKey: ["admin-backups"],
    queryFn: () => fetch("/api/backup").then((r) => r.json().then((d) => d.data)),
  });

  const backups = backupData?.backups || [];
  const stats = backupData?.stats;

  const createBackupMutation = useMutation({
    mutationFn: () => fetch("/api/backup", { method: "POST", headers: getMutationHeaders() }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: tAuto('auto.success'),
          description: tAuto('auto.backupCreatedSuccessfully'),
        });
        refetch();
      } else {
        toast({
          title: tAuto('auto.error'),
          description: extractErrorMessage(data.error, tAuto('auto.failedToCreateBackup')),
          variant: "destructive",
        });
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (filename: string) =>
      fetch("/api/backup/restore", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ filename }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      setRestoreDialogOpen(false);
      setRestoreTarget(null);
      if (data.success) {
        toast({
          title: tAuto('auto.success'),
          description: tAuto('auto.backupRestoredSuccessfullyYouMayNeedToRe'),
        });
      } else {
        toast({
          title: tAuto('auto.error'),
          description: extractErrorMessage(data.error, tAuto('auto.failedToRestoreBackup')),
          variant: "destructive",
        });
      }
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <TabsContent value="backup" className="mt-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DatabaseBackup className="h-5 w-5 text-teal-600" />
                {tAuto('auto.backupRestore')}
              </CardTitle>
              <Button
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 h-9 rounded-lg shadow-sm shadow-teal-500/20"
              >
                {createBackupMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {tAuto('auto.createBackup')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.totalBackups')}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{stats.totalBackups}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.totalSize')}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatSize(stats.totalSize)}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.newest')}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.newestBackup ? formatDate(stats.newestBackup) : "—"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.oldest')}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.oldestBackup ? formatDate(stats.oldestBackup) : "—"}
                  </p>
                </div>
              </div>
            )}

            {backupsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : backups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DatabaseBackup className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {tAuto('auto.noBackupsYet')}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {tAuto('auto.createYourFirstBackupToProtectYourData')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {backups.map((backup, idx) => (
                  <div
                    key={backup.id}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors",
                      "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30",
                      idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center shrink-0">
                        <DatabaseBackup className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate" dir="ltr">
                          {backup.filename}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-500">{formatDate(backup.timestamp)}</span>
                          <span className="text-xs text-slate-400 font-mono">{formatSize(backup.size)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-lg border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                      onClick={() => {
                        setRestoreTarget(backup.filename);
                        setRestoreDialogOpen(true);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {tAuto('auto.restore')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              {tAuto('auto.confirmRestore')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                {tAuto('auto.warningTheCurrentDatabaseWillBeReplacedW')}
              </p>
            </div>
            {restoreTarget && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium">{tAuto('auto.file')}</span>{" "}
                <span className="font-mono" dir="ltr">{restoreTarget}</span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => restoreTarget && restoreMutation.mutate(restoreTarget)}
                disabled={restoreMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white h-10 rounded-lg"
              >
                {restoreMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 me-2" />
                )}
                {tAuto('auto.yesRestore')}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setRestoreDialogOpen(false); setRestoreTarget(null); }}
                className="flex-1 h-10 rounded-lg"
              >
                {tAuto('auto.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== Automation Tab =====
export function AutomationTab({ isAr }: { isAr: boolean }) {
  const tAuto = useTranslations();
  const automations = [
    {
      id: "1",
      trigger: tAuto('auto.whenANewTaskIsCreated'),
      action: tAuto('auto.sendNotificationToProjectTeam'),
      enabled: true,
    },
    {
      id: "2",
      trigger: tAuto('auto.whenInvoiceDueDateIsApproaching'),
      action: tAuto('auto.sendReminderToClient'),
      enabled: true,
    },
    {
      id: "3",
      trigger: tAuto('auto.whenTaskStatusChangesToDone'),
      action: tAuto('auto.updateProjectProgressPercentage'),
      enabled: true,
    },
    {
      id: "4",
      trigger: tAuto('auto.whenALeaveRequestIsSubmitted'),
      action: tAuto('auto.notifyDirectManager'),
      enabled: false,
    },
    {
      id: "5",
      trigger: tAuto('auto.whenLateAttendanceIsRecorded'),
      action: tAuto('auto.autoRecordDeduction'),
      enabled: false,
    },
  ];

  return (
    <TabsContent value="automation" className="mt-2">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {tAuto('auto.automationRules')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tAuto('auto.configureAutomaticActions')}
              </p>
            </div>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full ms-3" />
          </div>
          <div className="space-y-3">
            {automations.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{rule.trigger}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <ArrowUpRight className="h-3 w-3 text-slate-400" />
                      <span className="truncate">{rule.action}</span>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={rule.enabled}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

// ===== System Health Sidebar =====
export function SystemHealthSidebar({ isAr }: { isAr: boolean }) {
  const tAuto = useTranslations();
  const systemHealth = [
    { label: tAuto('auto.cPU'), value: 23, color: "bg-emerald-500" },
    { label: tAuto('auto.memory'), value: 61, color: "bg-amber-500" },
    { label: tAuto('auto.disk'), value: 45, color: "bg-blue-500" },
    { label: tAuto('auto.network'), value: 12, color: "bg-emerald-500" },
  ];

  return (
    <Card className="border-slate-200 dark:border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Server className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.systemHealth')}
          </h3>
        </div>
        <div className="space-y-3">
          {systemHealth.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">{item.value}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", item.color)}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Mini Activity Timeline Sidebar =====
interface MiniActivityTimelineProps {
  isAr: boolean;
  activities: ActivityRecord[];
}

export function MiniActivityTimeline({ isAr, activities }: MiniActivityTimelineProps) {
  const tAuto = useTranslations();
  return (
    <Card className="border-slate-200 dark:border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.recentActivity')}
          </h3>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activities.length > 0 ? (
            activities.slice(0, 5).map((act, idx) => {
              const actionInfo = actionLabels[act.action] || { ar: act.action, en: act.action };
              const actionColorMap: Record<string, string> = {
                CREATE: "bg-emerald-500",
                UPDATE: "bg-blue-500",
                DELETE: "bg-red-500",
                APPROVE: "bg-teal-500",
                REJECT: "bg-orange-500",
              };
              return (
                <div key={act.id} className="flex items-start gap-2.5">
                  <div className="relative flex flex-col items-center">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", actionColorMap[act.action] || "bg-slate-400")} />
                    {idx < Math.min(activities.length, 5) - 1 && (
                      <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-3">
                    <p className="text-xs text-slate-900 dark:text-white font-medium truncate">
                      {act.user?.name || (tAuto('auto.user'))}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isAr ? actionInfo.ar : actionInfo.en} {act.entityType ? `— ${isAr ? entityLabels[act.entityType]?.ar || act.entityType : entityLabels[act.entityType]?.en || act.entityType}` : ""}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatTime(act.createdAt, isAr)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">
                {tAuto('auto.noActivities')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
