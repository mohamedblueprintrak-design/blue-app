"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plug,
  Plus,
  Trash2,
  Send,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import { SectionHeader } from "./section-header";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import { useToastFeedback } from "@/hooks/use-toast-feedback";

// ===== Types =====

interface Webhook {
  id: string;
  name: string;
  type: string;
  url: string;
  isActive: boolean;
  events: string; // JSON
  secret: string | null;
  lastTriggeredAt: string | null;
  failureCount: number;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
}

// ===== Event Types =====

const EVENT_OPTIONS = [
  { value: "invoice.created", labelEn: "Invoice Created", labelAr: "فاتورة جديدة" },
  { value: "invoice.paid", labelEn: "Invoice Paid", labelAr: "فاتورة مدفوعة" },
  { value: "task.assigned", labelEn: "Task Assigned", labelAr: "مهمة معينة" },
  { value: "task.overdue", labelEn: "Task Overdue", labelAr: "مهمة متأخرة" },
  { value: "approval.pending", labelEn: "Approval Pending", labelAr: "موافقة معلقة" },
  { value: "project.created", labelEn: "Project Created", labelAr: "مشروع جديد" },
  { value: "document.uploaded", labelEn: "Document Uploaded", labelAr: "مستند مرفوع" },
] as const;

// ===== Type Icons/Colors =====

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  SLACK: { icon: "💬", color: "bg-purple-50 dark:bg-purple-950 text-purple-600" },
  TEAMS: { icon: "📌", color: "bg-blue-50 dark:bg-blue-950 text-blue-600" },
  CUSTOM: { icon: "🔗", color: "bg-slate-50 dark:bg-slate-950 text-slate-600" },
};

// ===== Main Component =====

interface IntegrationsTabProps {
  isAr: boolean;
}

export function IntegrationsTab({ isAr }: IntegrationsTabProps) {
  const ar = isAr;
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; error?: string } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("SLACK");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["invoice.created"]);

  // ===== Fetch Webhooks =====

  const { data: webhooksData, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const res = await fetch("/api/webhooks");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.webhooks || json;
    },
  });

  const webhooks: Webhook[] = Array.isArray(webhooksData) ? webhooksData : [];

  // ===== Mutations =====

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          name: formName,
          type: formType,
          url: formUrl,
          events: formEvents,
          secret: formSecret || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData.error, "Failed to create"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      handleCloseDialog();
      toast.created(ar ? "الويب هوك" : "Webhook");
    },
    onError: (error: Error) => {
      toast.showError(
        ar ? `فشل في الإنشاء: ${error.message}` : `Failed to create: ${error.message}`
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
        headers: getMutationHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData.error, "Failed to delete"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setDeleteId(null);
      toast.deleted(ar ? "الويب هوك" : "Webhook");
    },
    onError: (error: Error) => {
      toast.showError(
        ar ? `فشل في الحذف: ${error.message}` : `Failed to delete: ${error.message}`
      );
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData.error, "Failed to toggle"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const handleTestWebhook = async (wh: Webhook) => {
    setTestingId(wh.id);
    setTestResult(null);

    try {
      // Direct test: send a simple POST to the webhook URL
      const testPayload = {
        event: "test",
        timestamp: new Date().toISOString(),
        data: { message: "Test from BluePrint", webhookName: wh.name },
        app: "BluePrint",
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(wh.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setTestResult({
        id: wh.id,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (error) {
      setTestResult({
        id: wh.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenCreate = () => {
    setFormName("");
    setFormType("SLACK");
    setFormUrl("");
    setFormSecret("");
    setFormEvents(["invoice.created"]);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUrl || formEvents.length === 0) {
      toast.showError(ar ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }
    createMutation.mutate();
  };

  const toggleEvent = (eventValue: string) => {
    setFormEvents((prev) =>
      prev.includes(eventValue)
        ? prev.filter((e) => e !== eventValue)
        : [...prev, eventValue]
    );
  };

  const parseEvents = (eventsJson: string): string[] => {
    try {
      return JSON.parse(eventsJson);
    } catch {
      return [];
    }
  };

  // ===== Render =====

  return (
    <Card>
      <CardContent className="p-6">
        <SectionHeader
          icon={Plug}
          title={ar ? "التكاملات والربط" : "Integrations"}
          subtitle={ar ? "ربط مع تطبيقات وخدمات خارجية" : "Connect with external apps and services"}
        />

        {/* Webhook Management Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-teal-600" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {ar ? "الويب هوك" : "Webhooks"}
              </h4>
            </div>
            <Button
              onClick={handleOpenCreate}
              className="bg-teal-600 hover:bg-teal-700 text-white h-8 text-xs rounded-lg"
            >
              <Plus className="h-3 w-3 me-1" />
              {ar ? "إضافة ويب هوك" : "Add Webhook"}
            </Button>
          </div>

          {/* Webhook List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{ar ? "لا توجد ويب هوك" : "No webhooks configured"}</p>
              <p className="text-xs mt-1">{ar ? "أضف ويب هوك لإرسال إشعارات تلقائية" : "Add a webhook to send automatic notifications"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {webhooks.map((wh) => {
                const typeConfig = TYPE_CONFIG[wh.type] || TYPE_CONFIG.CUSTOM;
                const events = parseEvents(wh.events);

                return (
                  <div
                    key={wh.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0", typeConfig.color)}>
                        {typeConfig.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {wh.name}
                          </p>
                          <Badge
                            className={cn(
                              "text-[10px] h-5 px-1.5 border-0",
                              wh.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            )}
                          >
                            {wh.isActive ? (ar ? "نشط" : "Active") : (ar ? "متوقف" : "Inactive")}
                          </Badge>
                          {wh.failureCount > 0 && (
                            <Badge className="bg-red-100 text-red-700 text-[10px] h-5 px-1.5 border-0">
                              <AlertTriangle className="h-3 w-3 me-0.5" />
                              {wh.failureCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{wh.url}</p>
                          {wh.lastTriggeredAt && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {ar ? "آخر إرسال:" : "Last:"} {formatDate(wh.lastTriggeredAt, ar)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {events.slice(0, 4).map((ev) => (
                            <Badge key={ev} variant="outline" className="text-[9px] h-4 px-1 border-slate-300 dark:border-slate-600">
                              {ev}
                            </Badge>
                          ))}
                          {events.length > 4 && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-300 dark:border-slate-600">
                              +{events.length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ms-2">
                      {/* Test result indicator */}
                      {testResult && testResult.id === wh.id && (
                        testResult.success
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <XCircle className="h-4 w-4 text-red-500" />
                      )}

                      {/* Test button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleTestWebhook(wh)}
                        disabled={testingId === wh.id}
                        title={ar ? "اختبار" : "Test"}
                      >
                        {testingId === wh.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                          : <Send className="h-3.5 w-3.5 text-teal-500" />}
                      </Button>

                      {/* Toggle active */}
                      <Switch
                        checked={wh.isActive}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: wh.id, isActive: checked })}
                        className="scale-75"
                      />

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400"
                        onClick={() => setDeleteId(wh.id)}
                        title={ar ? "حذف" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Webhook Dialog */}
        <Dialog open={showDialog} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialog(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{ar ? "إضافة ويب هوك" : "Add Webhook"}</DialogTitle>
              <DialogDescription>
                {ar ? "إرسال إشعارات تلقائية عند حدوث أحداث معينة" : "Send automatic notifications when certain events occur"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "الاسم" : "Name"} *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={ar ? "مثال: Slack الشركة" : "e.g., Company Slack"}
                  className="h-8 text-sm rounded-lg"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "النوع" : "Type"} *</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="h-8 text-sm rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SLACK">Slack</SelectItem>
                    <SelectItem value="TEAMS">Microsoft Teams</SelectItem>
                    <SelectItem value="CUSTOM">{ar ? "مخصص" : "Custom"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* URL */}
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "رابط الويب هوك" : "Webhook URL"} *</Label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder={
                    formType === "SLACK"
                      ? "https://hooks.slack.com/services/..."
                      : formType === "TEAMS"
                        ? "https://outlook.office.com/webhook/..."
                        : "https://example.com/webhook"
                  }
                  className="h-8 text-sm rounded-lg"
                  required
                  type="url"
                />
                {formType === "SLACK" && (
                  <p className="text-[10px] text-slate-400">
                    {ar ? "يجب أن يبدأ بـ https://hooks.slack.com/" : "Must start with https://hooks.slack.com/"}
                  </p>
                )}
                {formType === "TEAMS" && (
                  <p className="text-[10px] text-slate-400">
                    {ar ? "يجب أن يبدأ بـ https://outlook.office.com/webhook/" : "Must start with https://outlook.office.com/webhook/"}
                  </p>
                )}
              </div>

              {/* Secret (optional) */}
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "التوقيع السري (اختياري)" : "Secret (optional)"}</Label>
                <Input
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  placeholder={ar ? "للتحقق من التوقيع" : "For signature verification"}
                  className="h-8 text-sm rounded-lg"
                  type="password"
                />
              </div>

              {/* Events */}
              <div className="space-y-2">
                <Label className="text-xs">{ar ? "الأحداث" : "Events"} *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_OPTIONS.map((evt) => (
                    <label
                      key={evt.value}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-xs",
                        formEvents.includes(evt.value)
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formEvents.includes(evt.value)}
                        onChange={() => toggleEvent(evt.value)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                        formEvents.includes(evt.value)
                          ? "bg-teal-500 border-teal-500"
                          : "border-slate-300 dark:border-slate-600"
                      )}>
                        {formEvents.includes(evt.value) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span>{ar ? evt.labelAr : evt.labelEn}</span>
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  {ar ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? (ar ? "جارٍ الحفظ..." : "Saving...")
                    : (ar ? "حفظ" : "Save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ar ? "حذف الويب هوك؟" : "Delete Webhook?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {ar
                  ? "سيتم حذف الويب هوك نهائياً. لن يتم إرسال إشعارات مستقبلية إلى هذا الرابط."
                  : "The webhook will be permanently deleted. Future events will not be sent to this URL."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {ar ? "حذف" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
