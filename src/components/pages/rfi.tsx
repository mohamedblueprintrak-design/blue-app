"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rfiSchema, getErrorMessage, type RfiFormData } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  MessageSquareQuote,
  Filter,
  Trash2,
  MoreHorizontal,
  Reply,
  Calendar,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  Inbox,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ===== Types =====
interface RFIItem {
  id: string;
  projectId: string;
  number: string;
  subject: string;
  description: string;
  fromId: string;
  toId: string;
  priority: string;
  dueDate: string | null;
  response: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  from: { id: string; name: string; email: string; avatar: string };
  to: { id: string; name: string; email: string; avatar: string };
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }
interface UserOption { id: string; name: string; email: string; avatar: string; }

// ===== Helpers =====
function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string }> = {
    OPEN: { label: "مفتوح", labelEn: "Open", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    REPLIED: { label: "تم الرد", labelEn: "Replied", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    CLOSED: { label: "مغلق", labelEn: "Closed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
  };
  return configs[status] || configs.OPEN;
}

function getPriorityConfig(priority: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string; rowAccent: string }> = {
    NORMAL: { label: "عادي", labelEn: "Normal", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", rowAccent: "" },
    MEDIUM: { label: "متوسط", labelEn: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", rowAccent: "border-s-amber-300 border-s-2 dark:border-s-amber-700" },
    HIGH: { label: "عالي", labelEn: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", rowAccent: "border-s-orange-400 border-s-2 dark:border-s-orange-700" },
    URGENT: { label: "عاجل", labelEn: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", rowAccent: "border-s-red-400 border-s-4 dark:border-s-red-700" },
  };
  return configs[priority] || configs.NORMAL;
}

function getSLADaysLeft(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const target = new Date(dueDate);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatSLABadge(days: number | null, ar: boolean) {
  if (days === null) return null;
  if (days < 0) return { text: ar ? `${Math.abs(days)} يوم متأخر` : `${Math.abs(days)}d overdue`, color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", pulse: true };
  if (days === 0) return { text: ar ? "ينتهي اليوم" : "Due today", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", pulse: true };
  if (days <= 3) return { text: ar ? `${days} يوم متبقي` : `${days}d left`, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", pulse: true };
  return { text: ar ? `${days} يوم متبقي` : `${days}d left`, color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", pulse: false };
}

// ===== Main Component =====
interface RFIProps { language: "ar" | "en"; projectId?: string; }

export default function RFI({ language, projectId }: RFIProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<RFIItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");

  const { data: rfis = [], isLoading } = useQuery<RFIItem[]>({
    queryKey: ["rfi", filterProject],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      const res = await fetch(`/api/rfi?${params}`);
      if (!res.ok) throw new Error("Failed to fetch RFIs");
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch("/api/users-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/rfi", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create RFI");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfi"] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, response, status }: { id: string; response: string; status: string }) => {
      await fetch(`/api/rfi/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ response, status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfi"] });
      setShowReplyDialog(false);
      setReplyText("");
      setSelectedRFI(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/rfi/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rfi"] }),
  });

  const defaultRfiForm = { projectId: projectId || "", number: "", subject: "", description: "", fromId: "", toId: "", priority: "NORMAL" as const, dueDate: "" };
  const [_formData, setFormData] = useState(defaultRfiForm);

  const form = useForm<RfiFormData>({ resolver: zodResolver(rfiSchema) as unknown as Resolver<RfiFormData>, defaultValues: defaultRfiForm });
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, setValue, watch } = form;

  // Auto-set project filter from props
  useEffect(() => {
    if (projectId) {
      setFilterProject(projectId);
      setValue("projectId", projectId);
    }
  }, [projectId, setValue]);

  const resetForm = () => { const f = { ...defaultRfiForm, projectId: projectId || (filterProject !== "all" ? filterProject : "") }; setFormData(f); reset(f); };

  const handleOpenReply = (rfi: RFIItem) => {
    setSelectedRFI(rfi);
    setReplyText(rfi.response || "");
    setShowReplyDialog(true);
  };

  // Summary calculations
  const totalRFI = rfis.length;
  const openCount = rfis.filter((r) => r.status === "OPEN").length;
  const answeredCount = rfis.filter((r) => r.status === "REPLIED").length;
  const overdueCount = rfis.filter((r) => r.dueDate && new Date(r.dueDate) < new Date() && r.status !== "CLOSED").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <MessageSquareQuote className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "طلبات المعلومات" : "RFI"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {rfis.length} {ar ? "طلب" : "requests"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={ar ? "المشروع" : "Project"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع المشاريع" : "All Projects"}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "طلب جديد" : "New RFI"}
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Inbox className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي الطلبات" : "Total RFI"}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{totalRFI}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "مفتوح" : "Open"}</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{openCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "تم الرد" : "Answered"}</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{answeredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "متأخر" : "Overdue"}</p>
                <div className="flex items-center gap-1">
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{overdueCount}</p>
                  {overdueCount > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">{ar ? "جارٍ التحميل..." : "Loading..."}</div>
        ) : rfis.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <MessageSquareQuote className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{ar ? "لا توجد طلبات" : "No RFIs"}</h3>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-380px)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold">{ar ? "الرقم" : "Number"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "المشروع" : "Project"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "الموضوع" : "Subject"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "من" : "From"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "إلى" : "To"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "الأولوية" : "Priority"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "الموعد النهائي" : "Due Date"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfis.map((rfi) => {
                  const stCfg = getStatusConfig(rfi.status);
                  const prCfg = getPriorityConfig(rfi.priority);
                  const isOverdue = rfi.dueDate && new Date(rfi.dueDate) < new Date() && rfi.status !== "CLOSED";
                  const slaDays = getSLADaysLeft(rfi.dueDate);
                  const slaBadge = formatSLABadge(slaDays, ar);
                  return (
                    <TableRow
                      key={rfi.id}
                      className={cn(
                        "group even:bg-slate-50/50 dark:even:bg-slate-800/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        rfi.status === "OPEN" && prCfg.rowAccent,
                      )}
                    >
                      <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">{rfi.number || "-"}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[100px] truncate">{rfi.project ? (ar ? rfi.project.name : rfi.project.nameEn || rfi.project.name) : "-"}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-white max-w-[180px] truncate">{rfi.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={rfi.from.avatar} />
                            <AvatarFallback className="text-[8px] bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">{rfi.from.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{rfi.from.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={rfi.to.avatar} />
                            <AvatarFallback className="text-[8px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">{rfi.to.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{rfi.to.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", prCfg.color)}>
                          {ar ? prCfg.label : prCfg.labelEn}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {rfi.dueDate ? (
                            <span className={cn(
                              "text-xs",
                              isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500",
                            )}>
                              <span className="flex items-center gap-0.5">
                                <Calendar className="h-3 w-3" />
                                {new Date(rfi.dueDate).toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short", day: "numeric" })}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          {rfi.status === "OPEN" && slaBadge && (
                            <span className={cn(
                              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium",
                              slaBadge.color,
                              slaBadge.pulse && "animate-pulse",
                            )}>
                              <Clock className="h-2.5 w-2.5" />
                              {slaBadge.text}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", stCfg.color)}>
                          {ar ? stCfg.label : stCfg.labelEn}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="More options">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={ar ? "start" : "end"} className="w-40">
                            {rfi.status !== "CLOSED" && (
                              <DropdownMenuItem onClick={() => handleOpenReply(rfi)}>
                                <Reply className="h-3.5 w-3.5 me-2" />{ar ? "رد" : "Reply"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => { if (confirm(ar ? "هل أنت متأكد من الحذف؟" : "Delete this RFI?")) deleteMutation.mutate(rfi.id); }}>
                              <Trash2 className="h-3.5 w-3.5 me-2" />{ar ? "حذف" : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ar ? "طلب معلومات جديد" : "New RFI"}</DialogTitle>
            <DialogDescription>{ar ? "إرسال طلب معلومات جديد" : "Submit a new Request for Information"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={rhfHandleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المشروع" : "Project"} *</Label>
                {/* eslint-disable-next-line react-hooks/incompatible-library */}
                <Select value={watch("projectId")} onValueChange={(v) => setValue("projectId", v)}>
                  <SelectTrigger className={cn(errors.projectId && "border-red-500")}><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.projectId && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.projectId.message || "", ar)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الرقم" : "Number"}</Label>
                <Input {...register("number")} placeholder={ar ? "RFI-001" : "RFI-001"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "الموضوع" : "Subject"} *</Label>
              <Input {...register("subject")} placeholder={ar ? "موضوع الطلب" : "RFI subject"} className={cn(errors.subject && "border-red-500")} />
              {errors.subject && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.subject.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "الوصف" : "Description"}</Label>
              <Textarea {...register("description")} placeholder={ar ? "تفاصيل الطلب" : "RFI details"} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "من" : "From"} *</Label>
                <Select value={watch("fromId")} onValueChange={(v) => setValue("fromId", v)}>
                  <SelectTrigger className={cn(errors.fromId && "border-red-500")}><SelectValue placeholder={ar ? "المرسل" : "From"} /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.fromId && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.fromId.message || "", ar)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "إلى" : "To"} *</Label>
                <Select value={watch("toId")} onValueChange={(v) => setValue("toId", v)}>
                  <SelectTrigger className={cn(errors.toId && "border-red-500")}><SelectValue placeholder={ar ? "المستقبل" : "To"} /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.toId && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.toId.message || "", ar)}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الأولوية" : "Priority"}</Label>
                <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as RfiFormData["priority"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">{ar ? "عادي" : "Normal"}</SelectItem>
                    <SelectItem value="MEDIUM">{ar ? "متوسط" : "Medium"}</SelectItem>
                    <SelectItem value="HIGH">{ar ? "عالي" : "High"}</SelectItem>
                    <SelectItem value="URGENT">{ar ? "عاجل" : "Urgent"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "تاريخ الاستحقاق" : "Due Date"}</Label>
                <Input type="date" {...register("dueDate")} />
              </div>
            </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={createMutation.isPending}>
              {createMutation.isPending ? (ar ? "جارٍ الإرسال..." : "Sending...") : (ar ? "إرسال" : "Submit")}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedRFI && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Reply className="h-5 w-5 text-teal-500" />
                  {ar ? "الرد على الطلب" : "Reply to RFI"}
                </DialogTitle>
                <DialogDescription>{selectedRFI.subject}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Original Question */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedRFI.from.avatar} />
                      <AvatarFallback className="text-[9px] bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">{selectedRFI.from.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">{selectedRFI.from.name}</span>
                    <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedRFI.to.avatar} />
                      <AvatarFallback className="text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">{selectedRFI.to.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">{selectedRFI.to.name}</span>
                  </div>
                  {selectedRFI.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{selectedRFI.description}</p>
                  )}
                </div>

                <Separator />

                {/* Reply Area */}
                <div className="space-y-2">
                  <Label className="text-sm">{ar ? "الرد" : "Response"}</Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={ar ? "اكتب ردك هنا..." : "Type your response here..."}
                    rows={5}
                  />
                </div>

                {selectedRFI.response && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">{ar ? "الرد السابق" : "Previous Response"}</div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">{selectedRFI.response}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowReplyDialog(false); setReplyText(""); }}>
                  {ar ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  variant="secondary"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => replyMutation.mutate({ id: selectedRFI.id, response: replyText, status: "REPLIED" })}
                  disabled={!replyText || replyMutation.isPending}
                >
                  <Reply className="h-3.5 w-3.5 me-1" />
                  {replyMutation.isPending ? (ar ? "جارٍ الإرسال..." : "Sending...") : (ar ? "إرسال الرد" : "Send Reply")}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => replyMutation.mutate({ id: selectedRFI.id, response: replyText, status: "CLOSED" })}
                  disabled={!replyText || replyMutation.isPending}
                >
                  <CheckCircle className="h-3.5 w-3.5 me-1" />
                  {replyMutation.isPending ? (ar ? "جارٍ الإغلاق..." : "Closing...") : (ar ? "رد وإغلاق" : "Reply & Close")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
