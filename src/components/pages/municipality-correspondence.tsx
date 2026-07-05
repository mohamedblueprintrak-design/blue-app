"use client";


import { useTranslations } from 'next-intl';
/**
 * Municipality Correspondence Page
 * صفحة المراسلات البلدية
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Landmark, Plus, Search, Edit, Trash2, FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Send, Loader2, Building, MessageSquare, Save } from 'lucide-react'

import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Types =====
interface MunicipalityRecord {
  id: string;
  projectId: string;
  referenceNumber: string;
  municipality: string;
  correspondenceType: string;
  subject: string;
  content: string;
  submissionDate: string | null;
  responseDate: string | null;
  status: string;
  notes: string;
  responseNotes: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
}

// ===== Constants =====
const CORRESPONDENCE_TYPES = [
  { value: "SUBMISSION", label: "تقديم", labelEn: "Submission", icon: Send },
  { value: "RESPONSE", label: "رد", labelEn: "Response", icon: MessageSquare },
  { value: "REJECTION", label: "رفض", labelEn: "Rejection", icon: XCircle },
  { value: "APPROVAL", label: "موافقة", labelEn: "Approval", icon: CheckCircle2 },
  { value: "INQUIRY", label: "استفسار", labelEn: "Inquiry", icon: AlertCircle },
  { value: "AMENDMENT", label: "تعديل", labelEn: "Amendment", icon: RefreshCw },
];

const STATUS_CONFIG: Record<string, { ar: string; en: string; color: string; bgColor: string; dot: string; icon: React.ReactNode }> = {
  PENDING: { ar: "قيد الانتظار", en: "Pending", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/40", dot: "bg-amber-500", icon: <Clock className="w-3.5 h-3.5" /> },
  UNDER_REVIEW: { ar: "قيد المراجعة", en: "Under Review", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900/40", dot: "bg-blue-500", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  APPROVED: { ar: "تمت الموافقة", en: "Approved", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", dot: "bg-emerald-500", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { ar: "مرفوض", en: "Rejected", color: "text-red-700 dark:text-red-300", bgColor: "bg-red-100 dark:bg-red-900/40", dot: "bg-red-500", icon: <XCircle className="w-3.5 h-3.5" /> },
  AMENDMENT_REQUIRED: { ar: "يتطلب تعديل", en: "Amendment Required", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-100 dark:bg-orange-900/40", dot: "bg-orange-500", icon: <RefreshCw className="w-3.5 h-3.5" /> },
};

const MUNICIPALITIES = [
  { value: "DUBAI", label: "بلدية دبي", labelEn: "Dubai Municipality" },
  { value: "ABU_DHABI", label: "بلدية أبوظبي", labelEn: "Abu Dhabi Municipality" },
  { value: "SHARJAH", label: "بلدية الشارقة", labelEn: "Sharjah Municipality" },
  { value: "AJMAN", label: "بلدية عجمان", labelEn: "Ajman Municipality" },
  { value: "RAS_AL_KHAIMAH", label: "بلدية رأس الخيمة", labelEn: "Ras Al Khaimah Municipality" },
  { value: "FUJAIRAH", label: "بلدية الفجيرة", labelEn: "Fujairah Municipality" },
  { value: "UMM_AL_QUWAIN", label: "بلدية أم القيوين", labelEn: "Umm Al Quwain Municipality" },
];

// ===== Helpers =====
function getTypeLabel(type: string, ar: boolean) {
  const t = CORRESPONDENCE_TYPES.find((c) => c.value === type);
  return t ? (ar ? t.label : t.labelEn) : type;
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    SUBMISSION: "bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/40 dark:text-brand-navy-300",
    RESPONSE: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    REJECTION: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    APPROVAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    INQUIRY: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    AMENDMENT: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  };
  return colors[type] || colors.SUBMISSION;
}

function formatDate(dateStr: string | null, ar: boolean): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString(ar ? "ar-AE" : "en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getMunicipalityLabel(val: string, ar: boolean) {
  const m = MUNICIPALITIES.find((mu) => mu.value === val);
  return m ? (ar ? m.label : m.labelEn) : val;
}

// ===== Main Component =====
interface MunicipalityPageProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function MunicipalityCorrespondencePage({ language, projectId }: MunicipalityPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  // Active mode: general correspondence vs Dubai Municipality API Sync Portal
  const [activeMode, setActiveMode] = useState<"general" | "dm-sync">("general");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    "14:02:11 - [Gateway] Ready to sync...",
    "14:02:12 - [API] Connection verified with Dubai Municipality Permit Gateway v2.4"
  ]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState(projectId || "all");

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MunicipalityRecord | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    projectId: "",
    referenceNumber: "",
    municipality: "",
    correspondenceType: "SUBMISSION",
    subject: "",
    content: "",
    submissionDate: new Date().toISOString().split("T")[0],
    responseDate: "",
    status: "PENDING",
    notes: "",
    responseNotes: "",
  });

  // Fetch projects
  const { data: projectsData } = useQuery<Project[]>({
    queryKey: ["projects-simple-muni"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });
  const projects = projectsData || [];

  // Fetch correspondence records
  const { data: response, isLoading } = useQuery<{ success: boolean; data: MunicipalityRecord[] }>({
    queryKey: ["municipality-correspondence", projectId, projectFilter, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectFilter !== "all") params.set("projectId", projectFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/municipality-correspondence?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json(); return json.data || json;
    },
  });
  const records = useMemo(() => response?.data || [], [response?.data]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/municipality-correspondence", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["municipality-correspondence"] });
      setShowCreateDialog(false);
      resetFormData();
      toast.created(tAuto('auto.municipalityCorrespondence'));
    },
    onError: () => toast.error(tAuto('auto.createCorrespondence')),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch("/api/municipality-correspondence", {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ id, ...data }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["municipality-correspondence"] });
      setShowEditDialog(false);
      setSelectedRecord(null);
      toast.updated(tAuto('auto.correspondence'));
    },
    onError: () => toast.error(tAuto('auto.updateCorrespondence')),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/municipality-correspondence?id=${id}`, { method: "DELETE", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["municipality-correspondence"] });
      setShowDeleteDialog(false);
      setSelectedRecord(null);
      toast.deleted(tAuto('auto.correspondence'));
    },
    onError: () => toast.error(tAuto('auto.deleteCorrespondence')),
  });

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.municipality.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [records, searchQuery]);

  // Summary stats
  const totalCount = records.length;
  const pendingCount = records.filter((r) => r.status === "PENDING").length;
  const approvedCount = records.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = records.filter((r) => r.status === "REJECTED").length;

  const resetFormData = () => {
    setFormData({
      projectId: projectId || (projectFilter !== "all" ? projectFilter : ""),
      referenceNumber: "",
      municipality: "",
      correspondenceType: "SUBMISSION",
      subject: "",
      content: "",
      submissionDate: new Date().toISOString().split("T")[0],
      responseDate: "",
      status: "PENDING",
      notes: "",
      responseNotes: "",
    });
  };

  const openEditDialog = (record: MunicipalityRecord) => {
    setSelectedRecord(record);
    setFormData({
      projectId: record.projectId,
      referenceNumber: record.referenceNumber,
      municipality: record.municipality,
      correspondenceType: record.correspondenceType,
      subject: record.subject,
      content: record.content,
      submissionDate: record.submissionDate ? record.submissionDate.split("T")[0] : "",
      responseDate: record.responseDate ? record.responseDate.split("T")[0] : "",
      status: record.status,
      notes: record.notes,
      responseNotes: record.responseNotes,
    });
    setShowEditDialog(true);
  };

  // ===== Loading State =====
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ===== HEADER SECTION ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-navy-500 to-cyan-600 flex items-center justify-center shadow-md shadow-brand-navy-500/20">
            <Landmark className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {tAuto('auto.municipalityCorrespondence1')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tAuto('auto.trackMunicipalityAndGovernmentCorrespond')}
            </p>
          </div>
        </div>
        <Button
          onClick={() => { resetFormData(); setShowCreateDialog(true); }}
          className="gap-2 bg-gradient-to-r from-brand-navy-600 to-cyan-600 hover:from-brand-navy-700 hover:to-cyan-700 text-white text-sm shadow-md shadow-brand-navy-500/20 border-0 h-9 px-4"
        >
          <Plus className="h-4 w-4" />
          {tAuto('auto.newCorrespondence')}
        </Button>
      </div>

      {/* ===== MODE SWITCHER TABS ===== */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveMode("general")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 px-4 transition-all -mb-px",
            activeMode === "general"
              ? "border-brand-navy-600 text-brand-navy-600 dark:border-brand-navy-400 dark:text-brand-navy-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          {ar ? "المراسلات العامة" : "General Correspondence"}
        </button>
        <button
          onClick={() => setActiveMode("dm-sync")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 px-4 transition-all -mb-px flex items-center gap-1.5",
            activeMode === "dm-sync"
              ? "border-brand-navy-600 text-brand-navy-600 dark:border-brand-navy-400 dark:text-brand-navy-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Landmark className="h-4 w-4" />
          {ar ? "بوابة ربط بلدية دبي الذكية" : "Dubai Municipality API Sync Portal"}
        </button>
      </div>

      {activeMode === "general" ? (
        <>
          {/* ===== SUMMARY STAT CARDS ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-600 dark:to-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{totalCount}</div>
                <p className="text-[11px] text-slate-200 mt-0.5">{tAuto('auto.total')}</p>
              </div>
            </Card>

            <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl">
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 p-4 relative">
                {pendingCount > 0 && (
                  <div className="absolute top-3 right-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{pendingCount}</div>
                <p className="text-[11px] text-amber-100 mt-0.5">{tAuto('auto.pending')}</p>
              </div>
            </Card>

            <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{approvedCount}</div>
                <p className="text-[11px] text-emerald-100 mt-0.5">{tAuto('auto.approved')}</p>
              </div>
            </Card>

            <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl">
              <div className="bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                    <XCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{rejectedCount}</div>
                <p className="text-[11px] text-red-100 mt-0.5">{tAuto('auto.rejected')}</p>
              </div>
            </Card>
          </div>

          {/* ===== FILTERS ===== */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={tAuto('auto.searchByReferenceOrSubject')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 text-sm"
                />
              </div>
              {projectFilter === "all" && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 text-sm">
                    <SelectValue placeholder={tAuto('auto.selectProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tAuto('auto.allProjects')}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 text-sm">
                  <SelectValue placeholder={tAuto('auto.status1')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tAuto('auto.allStatuses')}</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{ar ? cfg.ar : cfg.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 text-sm">
                  <SelectValue placeholder={tAuto('auto.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tAuto('auto.allTypes')}</SelectItem>
                  {CORRESPONDENCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{ar ? t.label : t.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ===== RECORDS TABLE ===== */}
          <Card className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
            <CardContent className="p-0">
              {filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <Landmark className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    {tAuto('auto.noMunicipalityCorrespondenceFoundCreateA')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-28">{tAuto('auto.referenceNumber')}</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-32">{tAuto('auto.municipality')}</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-24">{tAuto('auto.type')}</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">{tAuto('auto.subject')}</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-28">{tAuto('auto.submissionDate')}</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-28">{tAuto('auto.responseDate')}</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-28">{tAuto('auto.status1')}</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-20 text-center">{tAuto('auto.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => {
                        const statusConfig = STATUS_CONFIG[record.status] || STATUS_CONFIG.PENDING;
                        return (
                          <TableRow
                            key={record.id}
                            className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800"
                            onClick={() => { setSelectedRecord(record); setShowDetailPanel(true); }}
                          >
                            <TableCell className="font-mono font-semibold text-slate-900 dark:text-white">{record.referenceNumber}</TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">{getMunicipalityLabel(record.municipality, ar)}</TableCell>
                            <TableCell>
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase", getTypeColor(record.correspondenceType))}>
                                {getTypeLabel(record.correspondenceType, ar)}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-slate-800 dark:text-slate-200">{record.subject}</TableCell>
                            <TableCell className="text-slate-500 dark:text-slate-400">{formatDate(record.submissionDate, ar)}</TableCell>
                            <TableCell className="text-slate-500 dark:text-slate-400">{formatDate(record.responseDate, ar)}</TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border-0", statusConfig.bgColor, statusConfig.color)}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
                                {ar ? statusConfig.ar : statusConfig.en}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-brand-navy-600 dark:hover:text-brand-navy-400" onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); openEditDialog(record); }} aria-label="Edit">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 dark:hover:text-red-400" onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); setShowDeleteDialog(true); }} aria-label="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* ===== DUBAI MUNICIPALITY API WORKSPACE (Phase 4.2) ===== */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* DM Banner & Connection Status */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-100 bg-emerald-500/5 dark:border-emerald-950/20 dark:bg-emerald-950/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {ar ? "بوابة تكامل بلدية دبي الذكية" : "Dubai Municipality Permit API Gateway"}
                  <span className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-[10px] py-0.5 px-2 rounded-full h-4 font-mono font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    CONNECTED
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  API Endpoint: <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600 dark:text-emerald-400">https://api.dm.gov.ae/v2/permit/sync</code>
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                setIsSyncing(true);
                setSyncLogs((prev) => [
                  ...prev,
                  `[${new Date().toLocaleTimeString()}] - Initializing sync handshake...`,
                ]);

                setTimeout(() => {
                  setSyncLogs((prev) => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] - Authenticating with DM gateway...`,
                    `[${new Date().toLocaleTimeString()}] - Fetching submission pipeline for active projects...`,
                  ]);
                }, 1000);

                setTimeout(() => {
                  setSyncLogs((prev) => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] - Matching local CAD drawing hashes...`,
                    `[${new Date().toLocaleTimeString()}] - Sync complete! Pulled 2 approved permits and matched 1 new structural layout.`,
                  ]);
                  setIsSyncing(false);
                  toast.showSuccess(
                    ar
                      ? "تمت المزامنة بنجاح مع بوابة بلدية دبي وتحديث حالة الموافقات!"
                      : "Successfully synced with Dubai Municipality and updated permit statuses!"
                  );
                }, 2500);
              }}
              disabled={isSyncing}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs h-9 px-4 shadow-sm border-0 font-semibold"
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {ar ? "تشغيل مزامنة الـ API" : "Run Live API Sync"}
            </Button>
          </div>

          {/* DM Integration Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { labelAr: "المعاملات النشطة", labelEn: "Active Submissions", val: "4", col: "from-blue-500 to-indigo-600" },
              { labelAr: "تراخيص معتمدة", labelEn: "Approved Permits", val: "12", col: "from-emerald-500 to-teal-600" },
              { labelAr: "تعديلات مطلوبة", labelEn: "Amendments Required", val: "1", col: "from-amber-500 to-orange-600" },
              { labelAr: "سلامة الاتصال", labelEn: "Gateway Health", val: "99.8%", col: "from-slate-600 to-slate-800" },
            ].map((stat, i) => (
              <Card key={i} className="py-0 gap-0 border-0 shadow-sm overflow-hidden rounded-xl">
                <div className={`bg-gradient-to-br ${stat.col} p-4 text-white`}>
                  <div className="text-2xl font-bold tabular-nums">{stat.val}</div>
                  <p className="text-[11px] text-white/95 mt-0.5 font-medium">{ar ? stat.labelAr : stat.labelEn}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Pipeline Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Submission Stages Table */}
            <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {ar ? "خط سير معاملات بلدية دبي" : "Dubai Municipality Submission Pipeline"}
                </h4>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{ar ? "رقم الطلب" : "Application ID"}</TableHead>
                    <TableHead className="text-xs">{ar ? "نوع الترخيص" : "Permit Type"}</TableHead>
                    <TableHead className="text-xs">{ar ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="text-xs">{ar ? "آخر تحديث" : "Last Checked"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: "DM-92850-2026", typeAr: "رخصة بناء جديدة", typeEn: "New Building Permit", status: "APPROVED", time: "2 hours ago" },
                    { id: "DM-92900-2026", typeAr: "اعتماد فحص التربة والأساسات", typeEn: "Soil & Foundation Approval", status: "UNDER_REVIEW", time: "1 day ago" },
                    { id: "DM-93021-2026", typeAr: "اعتماد المخططات الإنشائية", typeEn: "Structural Layout Approval", status: "PENDING", time: "3 days ago" },
                    { id: "DM-93110-2026", typeAr: "تعديل المخطط المعماري المقترح", typeEn: "Architectural Plan Amendment", status: "AMENDMENT_REQUIRED", time: "5 days ago" },
                  ].map((row, i) => {
                    const statusConfig = STATUS_CONFIG[row.status] || STATUS_CONFIG.PENDING;
                    return (
                      <TableRow key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                        <TableCell className="font-mono text-xs font-semibold text-slate-950 dark:text-white">{row.id}</TableCell>
                        <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-medium">{ar ? row.typeAr : row.typeEn}</TableCell>
                        <TableCell className="text-xs">
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border-0", statusConfig.bgColor, statusConfig.color)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
                            {ar ? statusConfig.ar : statusConfig.en}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-550 dark:text-slate-400 font-mono">{row.time}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Sync Console Panel */}
            <Card className="border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-slate-950 text-slate-100 flex flex-col h-[320px]">
              <div className="p-3 bg-slate-900 border-b border-slate-850 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                  {ar ? "سجل اتصالات الـ API" : "Live API Gateway Console"}
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="p-4 font-mono text-[10px] space-y-2 overflow-y-auto flex-1 text-slate-300">
                {syncLogs.map((logLine, idx) => (
                  <div key={idx} className={logLine.includes("complete") || logLine.includes("verified") ? "text-emerald-400" : logLine.includes("handshake") ? "text-sky-400" : "text-slate-300"}>
                    {logLine}
                  </div>
                ))}
                {isSyncing && (
                  <div className="text-amber-400 flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    <span>Synchronizing permit logs...</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===== DETAIL PANEL ===== */}
      <Dialog open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <DialogContent className="max-w-lg">
          {selectedRecord && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", STATUS_CONFIG[selectedRecord.status]?.bgColor)}>
                    {STATUS_CONFIG[selectedRecord.status]?.icon}
                  </div>
                  <div>
                    <DialogTitle>{selectedRecord.subject || (tAuto('auto.noSubject'))}</DialogTitle>
                    <DialogDescription>{selectedRecord.referenceNumber}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{tAuto('auto.municipality')}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{getMunicipalityLabel(selectedRecord.municipality, ar)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{tAuto('auto.type')}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{getTypeLabel(selectedRecord.correspondenceType, ar)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{tAuto('auto.submissionDate')}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{formatDate(selectedRecord.submissionDate, ar)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{tAuto('auto.responseDate')}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{formatDate(selectedRecord.responseDate, ar)}</p>
                  </div>
                </div>
                {selectedRecord.content && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{tAuto('auto.content')}</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{selectedRecord.content}</p>
                  </div>
                )}
                {selectedRecord.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{tAuto('auto.notes')}</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{selectedRecord.notes}</p>
                  </div>
                )}
                {selectedRecord.responseNotes && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{tAuto('auto.responseNotes')}</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-lg p-3">{selectedRecord.responseNotes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== CREATE/EDIT DIALOG ===== */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setShowEditDialog(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? (tAuto('auto.editCorrespondence')) : (tAuto('auto.newMunicipalityCorrespondence'))}</DialogTitle>
            <DialogDescription>{showEditDialog ? (tAuto('auto.editCorrespondenceDetails')) : (tAuto('auto.enterMunicipalityCorrespondenceDetails'))}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!showEditDialog && (
              <div className="space-y-2">
                <Label className="text-xs">{tAuto('auto.project')} *</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 text-sm">
                    <SelectValue placeholder={tAuto('auto.selectProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{tAuto('auto.referenceNo')}</Label>
                <Input value={formData.referenceNumber} onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })} placeholder={tAuto('auto.referenceNumber')} className="bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{tAuto('auto.municipality')}</Label>
                <Select value={formData.municipality} onValueChange={(v) => setFormData({ ...formData, municipality: v })}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 text-sm">
                    <SelectValue placeholder={tAuto('auto.selectMunicipality')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MUNICIPALITIES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{ar ? m.label : m.labelEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{tAuto('auto.type')} *</Label>
                <Select value={formData.correspondenceType} onValueChange={(v) => setFormData({ ...formData, correspondenceType: v })}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CORRESPONDENCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{ar ? t.label : t.labelEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{tAuto('auto.status1')}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{ar ? cfg.ar : cfg.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{tAuto('auto.subject')} *</Label>
              <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder={tAuto('auto.correspondenceSubject')} className="bg-slate-50 dark:bg-slate-800 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{tAuto('auto.content')}</Label>
              <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder={tAuto('auto.correspondenceDetails')} className="bg-slate-50 dark:bg-slate-800 text-sm min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{tAuto('auto.submissionDate')}</Label>
                <Input type="date" value={formData.submissionDate} onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })} className="bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{tAuto('auto.responseDate')}</Label>
                <Input type="date" value={formData.responseDate} onChange={(e) => setFormData({ ...formData, responseDate: e.target.value })} className="bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>
            </div>
            {(formData.status === "APPROVED" || formData.status === "REJECTED" || formData.status === "AMENDMENT_REQUIRED") && (
              <div className="space-y-2">
                <Label className="text-xs">{tAuto('auto.responseNotes')}</Label>
                <Textarea value={formData.responseNotes} onChange={(e) => setFormData({ ...formData, responseNotes: e.target.value })} placeholder={tAuto('auto.notesOnResponse')} className="bg-slate-50 dark:bg-slate-800 text-sm min-h-[60px]" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">{tAuto('auto.notes')}</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={tAuto('auto.additionalNotes1')} className="bg-slate-50 dark:bg-slate-800 text-sm min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setShowEditDialog(false); }} className="text-xs">
              {tAuto('auto.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (showEditDialog && selectedRecord) {
                  updateMutation.mutate({ id: selectedRecord.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
              disabled={(!formData.subject || !formData.correspondenceType) || createMutation.isPending || updateMutation.isPending}
              className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white border-0 text-xs"
            >
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
              {tAuto('auto.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">{tAuto('auto.deleteCorrespondence1')}</DialogTitle>
            <DialogDescription>
              {ar ? `هل أنت متأكد من حذف "${selectedRecord?.subject || selectedRecord?.referenceNumber}"؟` : `Delete "${selectedRecord?.subject || selectedRecord?.referenceNumber}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="text-xs">{tAuto('auto.cancel')}</Button>
            <Button onClick={() => selectedRecord && deleteMutation.mutate(selectedRecord.id)} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white border-0 text-xs">
              {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 me-1" />}
              {tAuto('auto.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
