"use client";

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
    SUBMISSION: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
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
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

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
      return res.json();
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
      return res.json();
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
      toast.created(ar ? "مراسلة بلدية" : "Municipality correspondence");
    },
    onError: () => toast.error(ar ? "إنشاء المراسلة" : "Create correspondence"),
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
      toast.updated(ar ? "المراسلة" : "Correspondence");
    },
    onError: () => toast.error(ar ? "تحديث المراسلة" : "Update correspondence"),
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
      toast.deleted(ar ? "المراسلة" : "Correspondence");
    },
    onError: () => toast.error(ar ? "حذف المراسلة" : "Delete correspondence"),
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md shadow-teal-500/20">
            <Landmark className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {ar ? "المراسلات البلدية" : "Municipality Correspondence"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ar ? "تتبع التفاعلات مع البلديات والجهات الحكومية" : "Track municipality and government correspondence"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => { resetFormData(); setShowCreateDialog(true); }}
          className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-sm shadow-md shadow-teal-500/20 border-0 h-9 px-4"
        >
          <Plus className="h-4 w-4" />
          {ar ? "مراسلة جديدة" : "New Correspondence"}
        </Button>
      </div>

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
            <p className="text-[11px] text-slate-200 mt-0.5">{ar ? "إجمالي المراسلات" : "Total"}</p>
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
            <p className="text-[11px] text-amber-100 mt-0.5">{ar ? "قيد الانتظار" : "Pending"}</p>
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
            <p className="text-[11px] text-emerald-100 mt-0.5">{ar ? "تمت الموافقة" : "Approved"}</p>
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
            <p className="text-[11px] text-red-100 mt-0.5">{ar ? "مرفوض" : "Rejected"}</p>
          </div>
        </Card>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={ar ? "بحث بالرقم المرجعي أو الموضوع..." : "Search by reference or subject..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 text-sm"
            />
          </div>
          {!projectId && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 text-sm">
              <SelectValue placeholder={ar ? "المشروع" : "Project"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع المشاريع" : "All Projects"}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 text-sm">
              <SelectValue placeholder={ar ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "كل الحالات" : "All Statuses"}</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{ar ? cfg.ar : cfg.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 text-sm">
              <SelectValue placeholder={ar ? "النوع" : "Type"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "كل الأنواع" : "All Types"}</SelectItem>
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
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-5">
                <Building className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {ar ? "لا توجد مراسلات" : "No Correspondence Found"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                {ar ? "لم يتم العثور على مراسلات بلدية. أنشئ مراسلة جديدة للبدء." : "No municipality correspondence found. Create a new one to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/30 border-slate-200 dark:border-slate-700/50">
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-28">{ar ? "الرقم المرجعي" : "Ref No."}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-32">{ar ? "البلدية" : "Municipality"}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-28">{ar ? "النوع" : "Type"}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">{ar ? "الموضوع" : "Subject"}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-28">{ar ? "تاريخ التقديم" : "Submitted"}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-28">{ar ? "تاريخ الرد" : "Response"}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-28">{ar ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-20 text-center">{ar ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record, idx) => {
                    const sc = STATUS_CONFIG[record.status] || STATUS_CONFIG.PENDING;
                    return (
                      <TableRow
                        key={record.id}
                        className={cn(
                          "border-slate-100 dark:border-slate-800/50 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors cursor-pointer",
                          idx % 2 === 1 && "bg-slate-50/50 dark:bg-slate-800/20"
                        )}
                        onClick={() => { setSelectedRecord(record); setShowDetailPanel(true); }}
                      >
                        <TableCell className="text-xs font-mono text-slate-500 dark:text-slate-400">{record.referenceNumber || "-"}</TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">{getMunicipalityLabel(record.municipality, ar)}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", getTypeColor(record.correspondenceType))}>
                            {getTypeLabel(record.correspondenceType, ar)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{record.subject || "-"}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.submissionDate, ar)}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.responseDate, ar)}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", sc.bgColor, sc.color)}>
                            {sc.icon}
                            {ar ? sc.ar : sc.en}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400" onClick={(e) => { e.stopPropagation(); openEditDialog(record); }} aria-label="Edit">
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
                    <DialogTitle>{selectedRecord.subject || (ar ? "بدون موضوع" : "No Subject")}</DialogTitle>
                    <DialogDescription>{selectedRecord.referenceNumber}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{ar ? "البلدية" : "Municipality"}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{getMunicipalityLabel(selectedRecord.municipality, ar)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{ar ? "النوع" : "Type"}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{getTypeLabel(selectedRecord.correspondenceType, ar)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{ar ? "تاريخ التقديم" : "Submission Date"}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{formatDate(selectedRecord.submissionDate, ar)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{ar ? "تاريخ الرد" : "Response Date"}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{formatDate(selectedRecord.responseDate, ar)}</p>
                  </div>
                </div>
                {selectedRecord.content && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{ar ? "المحتوى" : "Content"}</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{selectedRecord.content}</p>
                  </div>
                )}
                {selectedRecord.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{ar ? "ملاحظات" : "Notes"}</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{selectedRecord.notes}</p>
                  </div>
                )}
                {selectedRecord.responseNotes && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{ar ? "ملاحظات الرد" : "Response Notes"}</span>
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
            <DialogTitle>{showEditDialog ? (ar ? "تعديل المراسلة" : "Edit Correspondence") : (ar ? "مراسلة بلدية جديدة" : "New Municipality Correspondence")}</DialogTitle>
            <DialogDescription>{showEditDialog ? (ar ? "تعديل تفاصيل المراسلة" : "Edit correspondence details") : (ar ? "أدخل تفاصيل المراسلة البلدية" : "Enter municipality correspondence details")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!showEditDialog && (
              <div className="space-y-2">
                <Label className="text-xs">{ar ? "المشروع" : "Project"} *</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 text-sm">
                    <SelectValue placeholder={ar ? "اختر المشروع" : "Select project"} />
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
                <Label className="text-xs">{ar ? "الرقم المرجعي" : "Reference No."}</Label>
                <Input value={formData.referenceNumber} onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })} placeholder={ar ? "رقم المرجع" : "Reference number"} className="bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{ar ? "البلدية" : "Municipality"}</Label>
                <Select value={formData.municipality} onValueChange={(v) => setFormData({ ...formData, municipality: v })}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 text-sm">
                    <SelectValue placeholder={ar ? "اختر البلدية" : "Select municipality"} />
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
                <Label className="text-xs">{ar ? "النوع" : "Type"} *</Label>
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
                <Label className="text-xs">{ar ? "الحالة" : "Status"}</Label>
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
              <Label className="text-xs">{ar ? "الموضوع" : "Subject"} *</Label>
              <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder={ar ? "موضوع المراسلة" : "Correspondence subject"} className="bg-slate-50 dark:bg-slate-800 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{ar ? "المحتوى" : "Content"}</Label>
              <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder={ar ? "تفاصيل المراسلة..." : "Correspondence details..."} className="bg-slate-50 dark:bg-slate-800 text-sm min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{ar ? "تاريخ التقديم" : "Submission Date"}</Label>
                <Input type="date" value={formData.submissionDate} onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })} className="bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{ar ? "تاريخ الرد" : "Response Date"}</Label>
                <Input type="date" value={formData.responseDate} onChange={(e) => setFormData({ ...formData, responseDate: e.target.value })} className="bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>
            </div>
            {(formData.status === "APPROVED" || formData.status === "REJECTED" || formData.status === "AMENDMENT_REQUIRED") && (
              <div className="space-y-2">
                <Label className="text-xs">{ar ? "ملاحظات الرد" : "Response Notes"}</Label>
                <Textarea value={formData.responseNotes} onChange={(e) => setFormData({ ...formData, responseNotes: e.target.value })} placeholder={ar ? "ملاحظات على الرد..." : "Notes on response..."} className="bg-slate-50 dark:bg-slate-800 text-sm min-h-[60px]" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">{ar ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={ar ? "ملاحظات إضافية..." : "Additional notes..."} className="bg-slate-50 dark:bg-slate-800 text-sm min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setShowEditDialog(false); }} className="text-xs">
              {ar ? "إلغاء" : "Cancel"}
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
              className="bg-teal-600 hover:bg-teal-700 text-white border-0 text-xs"
            >
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
              {ar ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">{ar ? "حذف المراسلة" : "Delete Correspondence"}</DialogTitle>
            <DialogDescription>
              {ar ? `هل أنت متأكد من حذف "${selectedRecord?.subject || selectedRecord?.referenceNumber}"؟` : `Delete "${selectedRecord?.subject || selectedRecord?.referenceNumber}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="text-xs">{ar ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => selectedRecord && deleteMutation.mutate(selectedRecord.id)} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white border-0 text-xs">
              {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 me-1" />}
              {ar ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
