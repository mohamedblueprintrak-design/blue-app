"use client";


import { useTranslations } from 'next-intl';
import { useState, forwardRef, type ComponentPropsWithoutRef } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TableVirtuoso } from "react-virtuoso";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Filter, Trash2, MoreHorizontal, Eye, Edit3, SearchCheck, AlertTriangle, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, CalendarDays, Building2, ClipboardList } from 'lucide-react'

// ===== Types =====
interface Finding {
  id?: string;
  location: string;
  description: string;
  severity: string;
  category: string;
  photos: string;
  remediation: string;
  estimatedCost: number;
  status: string;
}

interface InspectionItem {
  id: string;
  inspectionNumber: string;
  projectId: string | null;
  clientId: string | null;
  buildingName: string;
  buildingAddress: string;
  inspectionType: string;
  riskLevel: string;
  inspectionDate: string;
  nextInspectionDate: string | null;
  inspectorName: string;
  summary: string;
  recommendations: string;
  repairEstimate: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; company: string } | null;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  findings: Finding[];
  _count?: { photos: number; findings: number };
}

interface Stats {
  total: number;
  green: number;
  yellow: number;
  orange: number;
  red: number;
  needsFollowup: number;
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }
interface ClientOption { id: string; name: string; company: string; }

// ===== Constants =====
const INSPECTION_TYPES = [
  { value: "STRUCTURAL", labelAr: "إنشائي", labelEn: "Structural" },
  { value: "crack", labelAr: "تشققات", labelEn: "Crack Assessment" },
  { value: "foundation", labelAr: "أساسات", labelEn: "Foundation" },
  { value: "concrete_core", labelAr: "عينات خرسانة", labelEn: "Concrete Core" },
  { value: "rebar_cover", labelAr: "غطاء حديد التسليح", labelEn: "Rebar Cover" },
  { value: "soil", labelAr: "تربة", labelEn: "Soil Investigation" },
  { value: "waterproofing", labelAr: "عزل مائي", labelEn: "Waterproofing" },
  { value: "ELECTRICAL", labelAr: "كهربائي", labelEn: "Electrical" },
  { value: "fire_safety", labelAr: "سلامة حريق", labelEn: "Fire Safety" },
];

const SEVERITY_OPTIONS = [
  { value: "LOW", labelAr: "منخفض", labelEn: "Low" },
  { value: "MEDIUM", labelAr: "متوسط", labelEn: "Medium" },
  { value: "HIGH", labelAr: "عالي", labelEn: "High" },
  { value: "CRITICAL", labelAr: "حرج", labelEn: "Critical" },
];

const CATEGORY_OPTIONS = [
  { value: "STRUCTURAL", labelAr: "إنشائي", labelEn: "Structural" },
  { value: "cosmetic", labelAr: "تجميلي", labelEn: "Cosmetic" },
  { value: "SAFETY", labelAr: "سلامة", labelEn: "Safety" },
  { value: "ELECTRICAL", labelAr: "كهربائي", labelEn: "Electrical" },
  { value: "PLUMBING", labelAr: "سباكة", labelEn: "Plumbing" },
];

const FINDING_STATUS_OPTIONS = [
  { value: "OPEN", labelAr: "مفتوح", labelEn: "Open" },
  { value: "IN_PROGRESS", labelAr: "قيد التنفيذ", labelEn: "In Progress" },
  { value: "RESOLVED", labelAr: "تم الحل", labelEn: "Resolved" },
];

// ===== Helpers =====
function getRiskConfig(level: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string; icon: string }> = {
    green: { label: "آمن", labelEn: "Safe", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", icon: "🟢" },
    yellow: { label: "يحتاج صيانة", labelEn: "Needs Maintenance", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800", icon: "🟡" },
    orange: { label: "يحتاج ترميم", labelEn: "Needs Repair", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800", icon: "🟠" },
    red: { label: "خطر", labelEn: "Dangerous", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800", icon: "🔴" },
  };
  return configs[level] || configs.GREEN;
}

function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; labelEn: string; color: string }> = {
    DRAFT: { label: "مسودة", labelEn: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    COMPLETED: { label: "مكتمل", labelEn: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    sent_to_client: { label: "أُرسل للعميل", labelEn: "Sent to Client", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    followup_needed: { label: "يحتاج متابعة", labelEn: "Follow-up Needed", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  };
  return configs[status] || configs.DRAFT;
}

function getInspectionTypeLabel(type: string, ar: boolean) {
  const found = INSPECTION_TYPES.find((t) => t.value === type);
  return found ? (ar ? found.labelAr : found.labelEn) : type;
}

function emptyFinding(): Finding {
  return { location: "", description: "", severity: "LOW", category: "STRUCTURAL", photos: "", remediation: "", estimatedCost: 0, status: "OPEN" };
}

// ===== Virtuoso Table Components (for virtualized rendering) =====
const VirtuosoTableComponents = {
  Scroller: forwardRef<HTMLDivElement>((props: ComponentPropsWithoutRef<'div'> & { className?: string }, ref) => <div {...props} ref={ref} className={cn("overflow-auto max-h-[calc(100vh-420px)] w-full custom-scrollbar", props.className)} />),
  Table: (props: ComponentPropsWithoutRef<'table'> & { className?: string }) => <Table {...props} className={cn("w-full caption-bottom text-sm", props.className)} />,
  TableHead: forwardRef<HTMLTableSectionElement>((props: ComponentPropsWithoutRef<'thead'> & { className?: string }, ref) => <TableHeader {...props} ref={ref} className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b]" />),
  TableRow: (props: ComponentPropsWithoutRef<'tr'> & { className?: string }) => <TableRow {...props} className={cn("group even:bg-slate-50/50 dark:even:bg-slate-800/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50", props.className)} />,
  TableBody: forwardRef<HTMLTableSectionElement>((props: ComponentPropsWithoutRef<'tbody'>, ref) => <TableBody {...props} ref={ref} />),
};

// ===== Main Component =====
interface InspectionsProps { language: "ar" | "en"; projectId?: string; }

export default function Inspections({ language, projectId: _projectId }: InspectionsProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingInspection, setViewingInspection] = useState<InspectionItem | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedFindings, setExpandedFindings] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    projectId: "",
    clientId: "",
    buildingName: "",
    buildingAddress: "",
    inspectionType: "",
    riskLevel: "green",
    inspectionDate: new Date().toISOString().split("T")[0],
    nextInspectionDate: "",
    inspectorName: "",
    summary: "",
    recommendations: "",
    repairEstimate: 0,
    status: "DRAFT",
    findings: [emptyFinding()] as Finding[],
  });

  const resetForm = () => {
    setFormData({
      projectId: "",
      clientId: "",
      buildingName: "",
      buildingAddress: "",
      inspectionType: "",
      riskLevel: "green",
      inspectionDate: new Date().toISOString().split("T")[0],
      nextInspectionDate: "",
      inspectorName: "",
      summary: "",
      recommendations: "",
      repairEstimate: 0,
      status: "DRAFT",
      findings: [emptyFinding()],
    });
    setEditingId(null);
  };

  // Fetch inspections
  const { data, isLoading } = useQuery<{ inspections: InspectionItem[]; stats: Stats }>({
    queryKey: ["inspections", filterRisk, filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterRisk !== "all") params.set("riskLevel", filterRisk);
      if (filterType !== "all") params.set("inspectionType", filterType);
      const res = await fetch(`/api/inspections?${params}`);
      if (!res.ok) throw new Error("Failed to fetch inspections");
      const json = await res.json(); return json.data || json;
    },
  });

  const inspections = data?.inspections || [];
  const stats = data?.stats || { total: 0, green: 0, yellow: 0, orange: 0, red: 0, needsFollowup: 0 };

  // Fetch projects and clients for dropdowns
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  const { data: clientsData } = useQuery<ClientOption[]>({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json;
    },
  });
  const clients = Array.isArray(clientsData) ? clientsData : [];

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const url = editingId ? `/api/inspections/${editingId}` : "/api/inspections";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getMutationHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save inspection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      setShowFormDialog(false);
      resetForm();
      toast[editingId ? "updated" : "created"](tAuto('auto.inspection'));
    },
    onError: () => {
      toast.error(tAuto('auto.saveInspection'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/inspections/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      toast.deleted(tAuto('auto.inspection'));
    },
    onError: () => {
      toast.error(tAuto('auto.deleteInspection'));
    },
  });

  // Findings management
  const addFinding = () => {
    setFormData((prev) => ({ ...prev, findings: [...prev.findings, emptyFinding()] }));
  };

  const removeFinding = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      findings: prev.findings.filter((_, i) => i !== index),
    }));
  };

  const updateFinding = (index: number, field: keyof Finding, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      findings: prev.findings.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    }));
  };

  // Auto-calculate risk level from findings
  const autoRiskLevel = (() => {
    const sevs = formData.findings.map((f) => f.severity);
    if (sevs.includes("CRITICAL")) return "red";
    if (sevs.includes("HIGH")) return "orange";
    if (sevs.includes("MEDIUM")) return "yellow";
    return "green";
  })();

  const autoRepairEstimate = formData.findings.reduce((sum, f) => sum + (f.estimatedCost || 0), 0);

  const handleEdit = (inspection: InspectionItem) => {
    setEditingId(inspection.id);
    setFormData({
      projectId: inspection.projectId || "",
      clientId: inspection.clientId || "",
      buildingName: inspection.buildingName,
      buildingAddress: inspection.buildingAddress,
      inspectionType: inspection.inspectionType,
      riskLevel: inspection.riskLevel,
      inspectionDate: inspection.inspectionDate ? inspection.inspectionDate.split("T")[0] : new Date().toISOString().split("T")[0],
      nextInspectionDate: inspection.nextInspectionDate ? inspection.nextInspectionDate.split("T")[0] : "",
      inspectorName: inspection.inspectorName,
      summary: inspection.summary,
      recommendations: inspection.recommendations,
      repairEstimate: inspection.repairEstimate,
      status: inspection.status,
      findings: inspection.findings.length > 0
        ? inspection.findings.map((f) => ({
            location: f.location,
            description: f.description,
            severity: f.severity,
            category: f.category,
            photos: f.photos,
            remediation: f.remediation,
            estimatedCost: f.estimatedCost,
            status: f.status,
          }))
        : [emptyFinding()],
    });
    setShowFormDialog(true);
  };

  const handleView = (inspection: InspectionItem) => {
    setViewingInspection(inspection);
    setShowViewDialog(true);
  };

  const handleSubmit = () => {
    saveMutation.mutate({
      projectId: formData.projectId || null,
      clientId: formData.clientId || null,
      buildingName: formData.buildingName,
      buildingAddress: formData.buildingAddress,
      inspectionType: formData.inspectionType,
      riskLevel: formData.riskLevel || autoRiskLevel,
      inspectionDate: formData.inspectionDate,
      nextInspectionDate: formData.nextInspectionDate || null,
      inspectorName: formData.inspectorName,
      summary: formData.summary,
      recommendations: formData.recommendations,
      repairEstimate: formData.repairEstimate || autoRepairEstimate,
      status: formData.status,
      findings: formData.findings,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
            <SearchCheck className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.buildingInspections')}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {inspections.length} {tAuto('auto.inspections')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto flex-wrap">
          <Select value={filterRisk} onValueChange={setFilterRisk}>
            <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={tAuto('auto.riskLevel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.allLevels')}</SelectItem>
              <SelectItem value="green">🟢 {tAuto('auto.safe')}</SelectItem>
              <SelectItem value="yellow">🟡 {tAuto('auto.maintenance')}</SelectItem>
              <SelectItem value="orange">🟠 {tAuto('auto.repair')}</SelectItem>
              <SelectItem value="red">🔴 {tAuto('auto.danger')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
              <SelectValue placeholder={tAuto('auto.inspectionType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.allTypes')}</SelectItem>
              {INSPECTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{ar ? t.labelAr : t.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20"
            onClick={() => { resetForm(); setShowFormDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newInspection')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.totalInspections')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.safe')}</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.green}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.needFollowUp')}</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{stats.yellow + stats.orange}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.dangerous')}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{stats.red}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Bar */}
      {stats.total > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-3">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {tAuto('auto.riskLevelDistribution')}
          </span>
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mt-2">
            {stats.green > 0 && <div className="bg-emerald-400 transition-all" style={{ width: `${(stats.green / stats.total) * 100}%` }} />}
            {stats.yellow > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${(stats.yellow / stats.total) * 100}%` }} />}
            {stats.orange > 0 && <div className="bg-orange-500 transition-all" style={{ width: `${(stats.orange / stats.total) * 100}%` }} />}
            {stats.red > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(stats.red / stats.total) * 100}%` }} />}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-emerald-400" />🟢 {stats.green}</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-amber-400" />🟡 {stats.yellow}</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-orange-500" />🟠 {stats.orange}</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-red-500" />🔴 {stats.red}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">{tAuto('auto.loading')}</div>
        ) : inspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <SearchCheck className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.noInspections')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tAuto('auto.addANewInspectionToGetStarted')}
            </p>
          </div>
        ) : (
          <TableVirtuoso
            data={inspections}
            components={VirtuosoTableComponents}
            fixedHeaderContent={() => (
              <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold">{tAuto('auto.no')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.building')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.type')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.date')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.risk')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.findings')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.cost')}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            )}
            itemContent={(_, inspection) => {
              const riskCfg = getRiskConfig(inspection.riskLevel);
              const statusCfg = getStatusConfig(inspection.status);
              return (
                <>
                  <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">{inspection.inspectionNumber}</TableCell>
                  <TableCell>
                    <div className="max-w-[180px]">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{inspection.buildingName || "-"}</p>
                      {inspection.buildingAddress && (
                        <p className="text-[10px] text-slate-400 truncate">{inspection.buildingAddress}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {getInspectionTypeLabel(inspection.inspectionType, ar)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(inspection.inspectionDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", riskCfg.color)}>
                      <span>{riskCfg.icon}</span>
                      {ar ? riskCfg.label : riskCfg.labelEn}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", statusCfg.color)}>
                      {ar ? statusCfg.label : statusCfg.labelEn}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 tabular-nums">{inspection.findings?.length || 0}</TableCell>
                  <TableCell className="text-xs text-slate-500 tabular-nums">
                    {inspection.repairEstimate > 0 ? `${inspection.repairEstimate.toLocaleString()} AED` : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="More options">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={ar ? "start" : "end"} className="w-36">
                        <DropdownMenuItem onClick={() => handleView(inspection)}>
                          <Eye className="h-3.5 w-3.5 me-2" />{tAuto('auto.view')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(inspection)}>
                          <Edit3 className="h-3.5 w-3.5 me-2" />{tAuto('auto.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400 focus:text-red-600"
                          onClick={() => { if (confirm(tAuto('auto.deleteThisInspection'))) deleteMutation.mutate(inspection.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 me-2" />{tAuto('auto.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </>
              );
            }}
          />
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showFormDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowFormDialog(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? (tAuto('auto.editInspection')) : (tAuto('auto.newInspection'))}
            </DialogTitle>
            <DialogDescription>
              {editingId ? (tAuto('auto.updateInspectionDetails')) : (tAuto('auto.createANewBuildingInspection'))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Building Info Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{tAuto('auto.buildingInformation')}</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.buildingName')} *</Label>
                  <Input value={formData.buildingName} onChange={(e) => setFormData((p) => ({ ...p, buildingName: e.target.value }))} placeholder={tAuto('auto.eGAhmedVilla')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.buildingAddress')}</Label>
                  <Input value={formData.buildingAddress} onChange={(e) => setFormData((p) => ({ ...p, buildingAddress: e.target.value }))} placeholder={tAuto('auto.fullAddress1')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.projectOptional')}</Label>
                  <Select value={formData.projectId} onValueChange={(v) => setFormData((p) => ({ ...p, projectId: v }))}>
                    <SelectTrigger><SelectValue placeholder={tAuto('auto.selectProject')} /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.clientOptional')}</Label>
                  <Select value={formData.clientId} onValueChange={(v) => setFormData((p) => ({ ...p, clientId: v }))}>
                    <SelectTrigger><SelectValue placeholder={tAuto('auto.selectClient')} /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` - ${c.company}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Inspection Details Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{tAuto('auto.inspectionDetails')}</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.inspectionType')} *</Label>
                  <Select value={formData.inspectionType} onValueChange={(v) => setFormData((p) => ({ ...p, inspectionType: v }))}>
                    <SelectTrigger><SelectValue placeholder={tAuto('auto.selectType1')} /></SelectTrigger>
                    <SelectContent>
                      {INSPECTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{ar ? t.labelAr : t.labelEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.inspector')}</Label>
                  <Input value={formData.inspectorName} onChange={(e) => setFormData((p) => ({ ...p, inspectorName: e.target.value }))} placeholder={tAuto('auto.inspectorName')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.inspectionDate')} *</Label>
                  <Input type="date" value={formData.inspectionDate} onChange={(e) => setFormData((p) => ({ ...p, inspectionDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.nextInspection')}</Label>
                  <Input type="date" value={formData.nextInspectionDate} onChange={(e) => setFormData((p) => ({ ...p, nextInspectionDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.riskLevel')}</Label>
                  <div className="flex items-center gap-2">
                    <Select value={formData.riskLevel} onValueChange={(v) => setFormData((p) => ({ ...p, riskLevel: v }))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="green">🟢 {tAuto('auto.safe')}</SelectItem>
                        <SelectItem value="yellow">🟡 {tAuto('auto.maintenance')}</SelectItem>
                        <SelectItem value="orange">🟠 {tAuto('auto.repair')}</SelectItem>
                        <SelectItem value="red">🔴 {tAuto('auto.dangerous')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {tAuto('auto.auto')} {getRiskConfig(autoRiskLevel).icon} {ar ? getRiskConfig(autoRiskLevel).label : getRiskConfig(autoRiskLevel).labelEn}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tAuto('auto.status1')}</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">{tAuto('auto.draft')}</SelectItem>
                      <SelectItem value="COMPLETED">{tAuto('auto.completed')}</SelectItem>
                      <SelectItem value="sent_to_client">{tAuto('auto.sentToClient')}</SelectItem>
                      <SelectItem value="followup_needed">{tAuto('auto.followUpNeeded')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Findings Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{tAuto('auto.findings')}</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5">{formData.findings.length}</Badge>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addFinding}>
                  <Plus className="h-3 w-3 me-1" />{tAuto('auto.add')}
                </Button>
              </div>
              <div className="space-y-3">
                {formData.findings.map((finding, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {tAuto('auto.finding')} #{idx + 1}
                      </span>
                      {formData.findings.length > 1 && (
                        <button onClick={() => removeFinding(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{tAuto('auto.location')}</Label>
                        <Input value={finding.location} onChange={(e) => updateFinding(idx, "location", e.target.value)} placeholder={tAuto('auto.eG2ndFloorBathroom')} className="text-sm h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{tAuto('auto.description')}</Label>
                        <Input value={finding.description} onChange={(e) => updateFinding(idx, "description", e.target.value)} placeholder={tAuto('auto.problemDescription')} className="text-sm h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{tAuto('auto.severity')}</Label>
                        <Select value={finding.severity} onValueChange={(v) => updateFinding(idx, "severity", v)}>
                          <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SEVERITY_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{tAuto('auto.category')}</Label>
                        <Select value={finding.category} onValueChange={(v) => updateFinding(idx, "category", v)}>
                          <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{ar ? c.labelAr : c.labelEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{tAuto('auto.estCostAED')}</Label>
                        <Input type="number" value={finding.estimatedCost || ""} onChange={(e) => updateFinding(idx, "estimatedCost", parseFloat(e.target.value) || 0)} placeholder="0" className="text-sm h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{tAuto('auto.status1')}</Label>
                        <Select value={finding.status} onValueChange={(v) => updateFinding(idx, "status", v)}>
                          <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FINDING_STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{tAuto('auto.remediation')}</Label>
                      <Textarea value={finding.remediation} onChange={(e) => updateFinding(idx, "remediation", e.target.value)} placeholder={tAuto('auto.describeRemediationApproach')} rows={2} className="text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Recommendations */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{tAuto('auto.summary')}</Label>
                <Textarea value={formData.summary} onChange={(e) => setFormData((p) => ({ ...p, summary: e.target.value }))} placeholder={tAuto('auto.generalSummaryOfBuildingCondition')} rows={3} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{tAuto('auto.recommendations')}</Label>
                <Textarea value={formData.recommendations} onChange={(e) => setFormData((p) => ({ ...p, recommendations: e.target.value }))} placeholder={tAuto('auto.repairAndMaintenanceRecommendations')} rows={3} className="text-sm" />
              </div>
            </div>

            {/* Auto-calculated totals */}
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{tAuto('auto.autoRiskLevel')}</span>
                <span className="font-medium">{getRiskConfig(autoRiskLevel).icon} {ar ? getRiskConfig(autoRiskLevel).label : getRiskConfig(autoRiskLevel).labelEn}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-500">{tAuto('auto.totalEstCost')}</span>
                <span className="font-medium tabular-nums">{autoRepairEstimate.toLocaleString()} AED</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); setShowFormDialog(false); }}>
              {tAuto('auto.cancel')}
            </Button>
            <Button
              className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
              disabled={saveMutation.isPending || !formData.buildingName || !formData.inspectionType || !formData.inspectionDate}
              onClick={handleSubmit}
            >
              {saveMutation.isPending ? (tAuto('auto.saving')) : (editingId ? (tAuto('auto.update')) : (tAuto('auto.create')))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewingInspection && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle>{tAuto('auto.inspectionDetails')}</DialogTitle>
                  <span className="text-sm font-mono text-slate-400">{viewingInspection.inspectionNumber}</span>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Header Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{viewingInspection.buildingName}</h4>
                    {viewingInspection.buildingAddress && <p className="text-xs text-slate-500 mt-1">{viewingInspection.buildingAddress}</p>}
                    {viewingInspection.project && (
                      <p className="text-xs text-brand-navy-600 dark:text-brand-navy-400 mt-1">
                        {tAuto('auto.project1')}{ar ? viewingInspection.project.name : viewingInspection.project.nameEn || viewingInspection.project.name}
                      </p>
                    )}
                    {viewingInspection.client && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {tAuto('auto.client1')}{viewingInspection.client.name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", getRiskConfig(viewingInspection.riskLevel).color)}>
                      {getRiskConfig(viewingInspection.riskLevel).icon} {ar ? getRiskConfig(viewingInspection.riskLevel).label : getRiskConfig(viewingInspection.riskLevel).labelEn}
                    </span>
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", getStatusConfig(viewingInspection.status).color)}>
                      {ar ? getStatusConfig(viewingInspection.status).label : getStatusConfig(viewingInspection.status).labelEn}
                    </span>
                    <Badge variant="outline" className="text-xs">{getInspectionTypeLabel(viewingInspection.inspectionType, ar)}</Badge>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{tAuto('auto.inspectionDate')}</p>
                    <p className="text-xs font-medium text-slate-900 dark:text-white mt-0.5">{new Date(viewingInspection.inspectionDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</p>
                  </div>
                  {viewingInspection.nextInspectionDate && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">{tAuto('auto.nextInspection')}</p>
                      <p className="text-xs font-medium text-slate-900 dark:text-white mt-0.5">{new Date(viewingInspection.nextInspectionDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{tAuto('auto.inspector')}</p>
                    <p className="text-xs font-medium text-slate-900 dark:text-white mt-0.5">{viewingInspection.inspectorName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{tAuto('auto.repairCost')}</p>
                    <p className="text-xs font-medium text-slate-900 dark:text-white mt-0.5">{viewingInspection.repairEstimate > 0 ? `${viewingInspection.repairEstimate.toLocaleString()} AED` : "-"}</p>
                  </div>
                </div>

                {/* Summary */}
                {viewingInspection.summary && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{tAuto('auto.summary')}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{viewingInspection.summary}</p>
                  </div>
                )}

                {/* Findings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tAuto('auto.findings')} ({viewingInspection.findings?.length || 0})
                    </h4>
                  </div>
                  {viewingInspection.findings && viewingInspection.findings.length > 0 ? (
                    <div className="space-y-2">
                      {viewingInspection.findings.map((finding, idx) => {
                        const sevLabel = SEVERITY_OPTIONS.find((s) => s.value === finding.severity);
                        const catLabel = CATEGORY_OPTIONS.find((c) => c.value === finding.category);
                        const fStatusLabel = FINDING_STATUS_OPTIONS.find((s) => s.value === finding.status);
                        const isExpanded = expandedFindings === finding.id || (idx === 0 && !expandedFindings);
                        return (
                          <div key={finding.id || idx} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button
                              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-start"
                              onClick={() => setExpandedFindings(isExpanded ? null : (finding.id || String(idx)))}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] text-slate-400 shrink-0">#{idx + 1}</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{finding.location || finding.description}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ms-2">
                                {sevLabel && (
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                    finding.severity === "CRITICAL" && "bg-red-100 text-red-700",
                                    finding.severity === "HIGH" && "bg-orange-100 text-orange-700",
                                    finding.severity === "MEDIUM" && "bg-amber-100 text-amber-700",
                                    finding.severity === "LOW" && "bg-slate-100 text-slate-600",
                                  )}>
                                    {ar ? sevLabel.labelAr : sevLabel.labelEn}
                                  </span>
                                )}
                                {isExpanded ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700/50 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div><span className="text-slate-400">{tAuto('auto.location1')}</span> <span className="text-slate-700 dark:text-slate-300">{finding.location || "-"}</span></div>
                                  <div><span className="text-slate-400">{tAuto('auto.category1')}</span> <span className="text-slate-700 dark:text-slate-300">{catLabel ? (ar ? catLabel.labelAr : catLabel.labelEn) : finding.category}</span></div>
                                  <div><span className="text-slate-400">{tAuto('auto.status')}</span> <span className="text-slate-700 dark:text-slate-300">{fStatusLabel ? (ar ? fStatusLabel.labelAr : fStatusLabel.labelEn) : finding.status}</span></div>
                                  {finding.estimatedCost > 0 && (
                                    <div><span className="text-slate-400">{tAuto('auto.cost1')}</span> <span className="text-slate-700 dark:text-slate-300 tabular-nums">{finding.estimatedCost.toLocaleString()} AED</span></div>
                                  )}
                                </div>
                                {finding.description && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{finding.description}</p>
                                )}
                                {finding.remediation && (
                                  <div className="rounded bg-brand-navy-50 dark:bg-brand-navy-900/20 p-2">
                                    <p className="text-[10px] font-medium text-brand-navy-700 dark:text-brand-navy-400 mb-0.5">{tAuto('auto.remediation')}</p>
                                    <p className="text-xs text-brand-navy-600 dark:text-brand-navy-300">{finding.remediation}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">{tAuto('auto.noFindingsRecorded')}</p>
                  )}
                </div>

                {/* Recommendations */}
                {viewingInspection.recommendations && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{tAuto('auto.recommendations')}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{viewingInspection.recommendations}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
