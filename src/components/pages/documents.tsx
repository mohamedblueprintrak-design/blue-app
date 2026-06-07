"use client";

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, LayoutGrid, List, FileText, Trash2, Eye, Pencil, Folder, FolderOpen, Upload, HardDrive, CalendarDays, Clock, ArrowUpDown, ChevronLeft, History } from 'lucide-react'

import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import DocumentVersionHistory from "@/components/common/document-version-history";

// ===== Types =====
interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  category: string;
  version: number;
  filePath: string;
  projectId: string | null;
  contractId: string | null;
  uploadedById: string | null;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  contract: { id: string; number: string; title: string } | null;
  uploader: { id: string; name: string; avatar: string } | null;
}

interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

// ===== Helpers =====
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// File type icons with distinct colors per the spec
function getFileTypeConfig(fileType: string) {
  const ext = (fileType || "").toLowerCase();
  if (ext === "pdf") return { icon: FileText, label: "PDF", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", border: "border-red-200 dark:border-red-800/40" };
  if (["doc", "docx"].includes(ext)) return { icon: FileText, label: "DOC", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800/40" };
  if (["xls", "xlsx"].includes(ext)) return { icon: FileText, label: "XLS", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800/40" };
  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) return { icon: FileText, label: "IMG", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30", border: "border-violet-200 dark:border-violet-800/40" };
  if (["dwg", "dxf"].includes(ext)) return { icon: FileText, label: "DWG", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800/40" };
  return { icon: FileText, label: ext.toUpperCase().slice(0, 4) || "FILE", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700/40" };
}

function getCategoryConfig(cat: string) {
  const configs: Record<string, { ar: string; en: string; color: string; icon: string }> = {
    general: { ar: "عام", en: "General", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: "📂" },
    contract: { ar: "عقد", en: "Contract", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", icon: "📋" },
    drawings: { ar: "مخططات", en: "Drawings", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", icon: "📐" },
    report: { ar: "تقرير", en: "Report", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", icon: "📊" },
    invoice: { ar: "فاتورة", en: "Invoice", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", icon: "🧾" },
    transmittal: { ar: "إحالة", en: "Transmittal", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300", icon: "📨" },
    specs: { ar: "مواصفات", en: "Specs", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", icon: "🔧" },
    calculations: { ar: "حسابات", en: "Calcs", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300", icon: "🔢" },
    photos: { ar: "صور", en: "Photos", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300", icon: "📷" },
  };
  return configs[cat] || configs.GENERAL;
}

// Hash-based avatar color
const avatarColors = [
  "bg-teal-500", "bg-amber-500", "bg-violet-500", "bg-rose-500",
  "bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-blue-500",
];
function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// Folder tree categories
const folderCategories = [
  { key: "all", ar: "كل الملفات", en: "All Files", icon: Folder },
  { key: "drawings", ar: "المخططات", en: "Drawings", icon: Folder },
  { key: "contract", ar: "العقود", en: "Contracts", icon: Folder },
  { key: "specs", ar: "المواصفات", en: "Specifications", icon: Folder },
  { key: "report", ar: "التقارير", en: "Reports", icon: Folder },
  { key: "calculations", ar: "الحسابات", en: "Calculations", icon: Folder },
  { key: "invoice", ar: "الفواتير", en: "Invoices", icon: Folder },
  { key: "transmittal", ar: "الإحالات", en: "Transmittals", icon: Folder },
  { key: "photos", ar: "الصور", en: "Photos", icon: Folder },
  { key: "general", ar: "عام", en: "General", icon: Folder },
];

// Sort button options
const sortButtonOptions = [
  { key: "name", ar: "الاسم", en: "Name", defaultDir: "asc" as const },
  { key: "date", ar: "التاريخ", en: "Date", defaultDir: "desc" as const },
  { key: "size", ar: "الحجم", en: "Size", defaultDir: "desc" as const },
  { key: "type", ar: "النوع", en: "Type", defaultDir: "asc" as const },
];

// ===== Main Component =====
interface DocumentsPageProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function DocumentsPage({ language, projectId }: DocumentsPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showDialog, setShowDialog] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["all"]));
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<Document | null>(null);
  const activeSortKey = sortBy.split("_")[0];
  const activeSortDir = sortBy.includes("_") ? sortBy.split("_")[1] : "desc";
  const handleSortClick = (key: string, defaultDir: "asc" | "desc") => {
    if (activeSortKey === key) {
      setSortBy(`${key}_${activeSortDir === "asc" ? "desc" : "asc"}`);
    } else {
      setSortBy(`${key}_${defaultDir}`);
    }
  };

  const emptyForm = {
    projectId: projectId || "", contractId: "", name: "", fileType: "",
    fileSize: 0, category: "general" as string, version: 1,
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["documents", projectId],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowDialog(false);
      setFormData(emptyForm);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/documents/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  // Filter
  const filtered = documents.filter((doc) => {
    const matchSearch = doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.fileType || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || doc.category === filterCategory;
    const matchProject = filterProject === "all" || doc.projectId === filterProject;
    return matchSearch && matchCat && matchProject;
  });

  // Computed stats
  const stats = (() => {
    const now = new Date();
    const thisMonth = documents.filter((d) => {
      const date = new Date(d.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const totalSize = documents.reduce((sum, d) => sum + d.fileSize, 0);
    const pendingReview = documents.filter((d) => d.category === "transmittal" || d.category === "specs").length;
    return {
      total: documents.length,
      thisMonth,
      pendingReview,
      totalSize,
    };
  })();

  // Category counts for folder tree
  const categoryCounts = (() => {
    const counts: Record<string, number> = {};
    documents.forEach((d) => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return counts;
  })();

  const openEdit = (doc: Document) => {
    setEditDoc(doc);
    setFormData({
      projectId: doc.projectId || "",
      contractId: doc.contractId || "",
      name: doc.name,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      category: doc.category,
      version: doc.version,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    createMutation.mutate(formData);
  };

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Sort documents
  const getSorted = (docs: Document[]) => {
    const sorted = [...docs];
    switch (sortBy) {
      case "name_asc": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name_desc": sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "date_asc": sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "date_desc": sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "size_asc": sorted.sort((a, b) => a.fileSize - b.fileSize); break;
      case "size_desc": sorted.sort((a, b) => b.fileSize - a.fileSize); break;
      case "type_asc": sorted.sort((a, b) => (a.fileType || "").localeCompare(b.fileType || "")); break;
      default: break;
    }
    return sorted;
  };
  const sortedFiltered = getSorted(filtered);

  // Storage usage mock data
  const storageUsed = 2.4; // GB
  const storageTotal = 10; // GB
  const storagePercent = (storageUsed / storageTotal) * 100;

  // Breadcrumb path
  const breadcrumbItems = useMemo(() => {
    if (filterCategory === "all") return [ar ? "الجذر" : "Root"];
    const cat = folderCategories.find(c => c.key === filterCategory);
    return [
      { label: ar ? "الجذر" : "Root", key: "all" },
      { label: cat ? (ar ? cat.ar : cat.en) : (filterCategory), key: filterCategory },
    ];
  }, [filterCategory, ar]);

  const categories = ["all", "general", "contract", "drawings", "report", "invoice", "transmittal", "specs", "calculations", "photos"];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const mainContent = (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي المستندات" : "Total Documents"}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "هذا الشهر" : "This Month"}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "بانتظار المراجعة" : "Pending Review"}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.pendingReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "التخزين المستخدم" : "Storage Used"}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breadcrumb Path */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {breadcrumbItems.map((item, idx) => (
          <span key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronLeft className="h-3 w-3" />}
            <button
              onClick={() => setFilterCategory(typeof item === "string" ? "all" : item.key)}
              className={cn(
                "hover:text-teal-600 dark:hover:text-teal-400 transition-colors",
                idx === breadcrumbItems.length - 1 ? "text-slate-700 dark:text-slate-300 font-medium" : ""
              )}
            >
              {typeof item === "string" ? item : item.label}
            </button>
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "المستندات" : "Documents"}</h2>
          <Badge variant="secondary" className="text-xs">{sortedFiltered.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "بحث في المستندات..." : "Search documents..."} className="ps-9 h-8 text-sm" />
          </div>
          {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[140px] h-8 text-xs hidden sm:block"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "كل المشاريع" : "All Projects"}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
          {/* Sort By Buttons */}
          <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <ArrowUpDown className="h-3 w-3 text-slate-400 mx-1.5 shrink-0" />
            {sortButtonOptions.map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleSortClick(btn.key, btn.defaultDir)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap",
                  activeSortKey === btn.key
                    ? "bg-teal-500 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                )}
              >
                {ar ? btn.ar : btn.en}
                {activeSortKey === btn.key && (
                  <span className="ms-0.5 text-[9px]">{activeSortDir === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            ))}
          </div>
          {/* View Toggle */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-none" onClick={() => setViewMode("grid")} aria-label="Grid view">
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-none" onClick={() => setViewMode("list")} aria-label="List view">
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { setFormData(emptyForm); setEditDoc(null); setShowDialog(true); }}>
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "مستند جديد" : "New Document"}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Sidebar - Folder Tree */}
        <div className="w-52 shrink-0 hidden lg:block">
          <Card className="border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
            <CardContent className="p-2">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase px-3 py-2">
                {ar ? "التصنيفات" : "Categories"}
              </p>
              <ScrollArea className="max-h-[calc(100vh-20rem)]">
                <div className="space-y-0.5">
                  {folderCategories.map((cat) => {
                    const count = cat.key === "all" ? documents.length : (categoryCounts[cat.key] || 0);
                    const isActive = filterCategory === cat.key;
                    const isExpanded = expandedFolders.has(cat.key);
                    const FolderIcon = isExpanded && cat.key !== "all" ? FolderOpen : Folder;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => {
                          setFilterCategory(cat.key);
                          if (cat.key !== "all") toggleFolder(cat.key);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors text-start ${
                          isActive
                            ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <FolderIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-teal-500" : "text-slate-400 dark:text-slate-500"}`} />
                        <span className="flex-1 truncate">{ar ? cat.ar : cat.en}</span>
                        <span className={`text-[10px] tabular-nums min-w-[18px] text-center rounded-full px-1 ${
                          isActive
                            ? "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Storage Usage Card */}
          <Card className="border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <HardDrive className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{ar ? "استخدام التخزين" : "Storage Usage"}</p>
                </div>
                <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {storageUsed.toFixed(1)} GB <span className="text-xs font-normal text-slate-400">/ {storageTotal} GB</span>
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    storagePercent > 80 ? "bg-red-500" : storagePercent > 60 ? "bg-amber-500" : "bg-teal-500"
                  )}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                {(storageTotal - storageUsed).toFixed(1)} GB {ar ? "متاح" : "AVAILABLE"} ({Math.round(100 - storagePercent)}% {ar ? "فارغ" : "free"})
              </p>
            </CardContent>
          </Card>

          {/* Upload Drop Zone */}
          {showUploadZone && (
            <div
              className="border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-teal-50/50 dark:bg-teal-950/10 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors cursor-pointer"
              onClick={() => { setShowUploadZone(false); setShowDialog(true); }}
            >
              <div className="w-14 h-14 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Upload className="h-7 w-7 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {ar ? "اسحب الملفات هنا أو انقر للرفع" : "Drag files here or click to upload"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  PDF, DWG, DOCX, XLSX, JPG, PNG — {ar ? "حتى 50 ميجابايت" : "up to 50MB"}
                </p>
              </div>
              <Button
                size="sm"
                className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={(e) => { e.stopPropagation(); setShowUploadZone(false); setShowDialog(true); }}
              >
                <Plus className="h-3.5 w-3.5 me-1" />
                {ar ? "اختيار ملفات" : "Choose Files"}
              </Button>
            </div>
          )}

          {/* Upload Button (when zone is hidden) */}
          {!showUploadZone && (
            <button
              onClick={() => setShowUploadZone(true)}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span className="text-xs font-medium">{ar ? "اسحب الملفات هنا للرفع" : "Drag files here to upload"}</span>
            </button>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {sortedFiltered.map((doc) => {
                const typeConf = getFileTypeConfig(doc.fileType);
                const TypeIcon = typeConf.icon;
                const catCfg = getCategoryConfig(doc.category);
                const avatarColor = getAvatarColor(doc.uploader?.name || doc.name);
                const avatarInitial = (doc.uploader?.name || doc.name).charAt(0).toUpperCase();

                return (
                  <Card
                    key={doc.id}
                    className="group hover:shadow-md transition-all duration-200 border-slate-200 dark:border-slate-700/50 cursor-pointer hover:border-teal-200 dark:hover:border-teal-800/50"
                    onClick={() => setViewDoc(doc)}
                  >
                    <CardContent className="p-4">
                      {/* File type icon - large centered */}
                      <div className={`w-full h-20 rounded-lg ${typeConf.bg} border ${typeConf.border} flex items-center justify-center mb-3 group-hover:scale-[1.02] transition-transform duration-200`}>
                        <TypeIcon className={`h-8 w-8 ${typeConf.color} opacity-60`} />
                        <span className={`absolute text-lg font-bold ${typeConf.color} opacity-80`}>
                          {typeConf.label}
                        </span>
                      </div>

                      {/* File name + size */}
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={doc.name}>
                          {doc.name || (ar ? "بدون اسم" : "Untitled")}
                        </h3>
                        <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      </div>

                      {/* Project name */}
                      {doc.project && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {ar ? doc.project.name : doc.project.nameEn || doc.project.name}
                        </p>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className={`text-[10px] h-5 ${catCfg.color}`}>
                          {ar ? catCfg.ar : catCfg.en}
                        </Badge>
                        {doc.version > 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                            v{doc.version}
                          </span>
                        )}
                      </div>

                      {/* Bottom row */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-5 w-5 rounded-full ${avatarColor} flex items-center justify-center text-[9px] font-bold text-white`}>
                            {avatarInitial}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                            {doc.uploader?.name || (ar ? "غير محدد" : "Unknown")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setVersionHistoryDoc(doc); }}
                            title={ar ? "سجل الإصدارات" : "Version History"}
                          >
                            <History className="h-3 w-3" />
                          </Button>
                          <span>{new Date(doc.createdAt).toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {sortedFiltered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{ar ? "لا توجد مستندات" : "No documents found"}</p>
                  <p className="text-xs mt-1">{ar ? "حاول تغيير التصنيف أو كلمة البحث" : "Try changing category or search"}</p>
                </div>
              )}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
              <ScrollArea className="max-h-[calc(100vh-20rem)]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                      <TableHead className="text-xs font-semibold">{ar ? "الاسم" : "Name"}</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">{ar ? "النوع" : "Type"}</TableHead>
                      <TableHead className="text-xs font-semibold hidden sm:table-cell">{ar ? "التصنيف" : "Category"}</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">{ar ? "المشروع" : "Project"}</TableHead>
                      <TableHead className="text-xs font-semibold">{ar ? "الحجم" : "Size"}</TableHead>
                      <TableHead className="text-xs font-semibold">{ar ? "الإصدار" : "Ver"}</TableHead>
                      <TableHead className="text-xs font-semibold hidden sm:table-cell">{ar ? "التاريخ" : "Date"}</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">{ar ? "رفع بواسطة" : "Uploaded By"}</TableHead>
                      <TableHead className="text-xs font-semibold text-start">{ar ? "إجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFiltered.map((doc, idx) => {
                      const typeConf = getFileTypeConfig(doc.fileType);
                      const TypeIcon = typeConf.icon;
                      const catCfg = getCategoryConfig(doc.category);
                      return (
                        <TableRow
                          key={doc.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            idx % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/20" : ""
                          }`}
                          onClick={() => setViewDoc(doc)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`shrink-0 w-8 h-8 rounded-lg ${typeConf.bg} flex items-center justify-center`}>
                                <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                              </div>
                              <span className="text-sm font-medium text-slate-900 dark:text-white max-w-[200px] truncate">{doc.name || (ar ? "بدون اسم" : "Untitled")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">{doc.fileType || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary" className={`text-[10px] h-5 ${catCfg.color}`}>{ar ? catCfg.ar : catCfg.en}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                            {doc.project ? (ar ? doc.project.name : doc.project.nameEn || doc.project.name) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">{formatFileSize(doc.fileSize)}</TableCell>
                          <TableCell className="text-xs tabular-nums">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              doc.version > 1 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}>
                              v{doc.version}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-slate-500 dark:text-slate-400">{new Date(doc.createdAt).toLocaleDateString(ar ? "ar-AE" : "en-US")}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1.5">
                              <div className={`h-5 w-5 rounded-full ${getAvatarColor(doc.uploader?.name || "")} flex items-center justify-center text-[8px] font-bold text-white`}>
                                {(doc.uploader?.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{doc.uploader?.name || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-start" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDoc(doc)} aria-label="View"><Eye className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVersionHistoryDoc(doc)} aria-label="Version History"><History className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(doc)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { if (confirm(ar ? "حذف المستند؟" : "Delete document?")) deleteMutation.mutate(doc.id); }} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {sortedFiltered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-slate-400 dark:text-slate-500">
                          {ar ? "لا توجد مستندات" : "No documents found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) setViewDoc(null); }}>
        <DialogContent className="max-w-lg">
          {viewDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const tc = getFileTypeConfig(viewDoc.fileType);
                    const TIcon = tc.icon;
                    return (
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${tc.bg}`}>
                        <TIcon className={`h-4 w-4 ${tc.color}`} />
                      </span>
                    );
                  })()}
                  {viewDoc.name || (ar ? "بدون اسم" : "Untitled")}
                </DialogTitle>
                <DialogDescription>{ar ? "تفاصيل المستند" : "Document details"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400 dark:text-slate-500">{ar ? "التصنيف" : "Category"}</Label>
                    <Badge variant="secondary" className={`text-xs mt-1 ${getCategoryConfig(viewDoc.category).color}`}>
                      {ar ? getCategoryConfig(viewDoc.category).ar : getCategoryConfig(viewDoc.category).en}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400 dark:text-slate-500">{ar ? "نوع الملف" : "File Type"}</Label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{viewDoc.fileType.toUpperCase() || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400 dark:text-slate-500">{ar ? "الحجم" : "File Size"}</Label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formatFileSize(viewDoc.fileSize)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400 dark:text-slate-500">{ar ? "الإصدار" : "Version"}</Label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">v{viewDoc.version}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400 dark:text-slate-500">{ar ? "المشروع" : "Project"}</Label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{viewDoc.project ? (ar ? viewDoc.project.name : viewDoc.project.nameEn || viewDoc.project.name) : (ar ? "غير مرتبط" : "Unlinked")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400 dark:text-slate-500">{ar ? "رفع بواسطة" : "Uploaded By"}</Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`h-5 w-5 rounded-full ${getAvatarColor(viewDoc.uploader?.name || "")} flex items-center justify-center text-[8px] font-bold text-white`}>
                        {(viewDoc.uploader?.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{viewDoc.uploader?.name || (ar ? "غير محدد" : "Unknown")}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-400 dark:text-slate-500">{ar ? "تاريخ الرفع" : "Upload Date"}</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{new Date(viewDoc.createdAt).toLocaleString(ar ? "ar-AE" : "en-US")}</p>
                </div>
              </div>
              
              {/* Document Preview section */}
              {viewDoc.filePath && (
                <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <Label className="text-xs text-slate-400 dark:text-slate-500 mb-2 block">{ar ? "معاينة المستند" : "Document Preview"}</Label>
                  {["jpg", "jpeg", "png", "gif", "webp"].includes((viewDoc.fileType || "").toLowerCase()) ? (
                    <div className="rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={viewDoc.filePath} alt={viewDoc.name} className="w-full h-auto max-h-[300px] object-contain bg-slate-50 dark:bg-slate-900" />
                    </div>
                  ) : ["pdf"].includes((viewDoc.fileType || "").toLowerCase()) ? (
                    <div className="rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 h-[400px]">
                      <iframe src={viewDoc.filePath} className="w-full h-full" title={viewDoc.name} />
                    </div>
                  ) : (
                    <div className="p-8 text-center border rounded-md bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-sm text-slate-500">{ar ? "المعاينة غير متاحة لهذا النوع من الملفات" : "Preview not available for this file type"}</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => window.open(viewDoc.filePath, '_blank')}>
                        {ar ? "تحميل الملف" : "Download File"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={showDialog && !viewDoc} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditDoc(null); setFormData(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editDoc ? (ar ? "تعديل مستند" : "Edit Document") : (ar ? "مستند جديد" : "New Document")}</DialogTitle>
            <DialogDescription>{editDoc ? (ar ? "تعديل بيانات المستند" : "Update document metadata") : (ar ? "إضافة مستند جديد (تخزين بيانات فقط)" : "Add new document (metadata only)")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "اسم المستند" : "Document Name"} *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={ar ? "أدخل اسم المستند" : "Enter document name"} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "نوع الملف" : "File Type"}</Label>
                <Select value={formData.fileType} onValueChange={(v) => setFormData({ ...formData, fileType: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={ar ? "اختر النوع" : "Select type"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="dwg">DWG</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="jpg">JPG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="zip">ZIP</SelectItem>
                    <SelectItem value="dxf">DXF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "حجم الملف (بالبايت)" : "File Size (bytes)"}</Label>
                <Input type="number" value={formData.fileSize || ""} onChange={(e) => setFormData({ ...formData, fileSize: parseFloat(e.target.value) || 0 })} placeholder="1024" className="h-8 text-sm tabular-nums" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "التصنيف" : "Category"} *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c !== "all").map((cat) => {
                    const cfg = getCategoryConfig(cat);
                    return <SelectItem key={cat} value={cat}>{ar ? cfg.ar : cfg.en}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "المشروع" : "Project"}</Label>
              <Select value={formData.projectId || "none"} onValueChange={(v) => setFormData({ ...formData, projectId: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={ar ? "اختر مشروع (اختياري)" : "Select project (optional)"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{ar ? "بدون مشروع" : "No project"}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "رقم العقد" : "Contract ID"}</Label>
                <Input value={formData.contractId} onChange={(e) => setFormData({ ...formData, contractId: e.target.value })} placeholder={ar ? "اختياري" : "Optional"} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ar ? "الإصدار" : "Version"}</Label>
                <Input type="number" value={formData.version} onChange={(e) => setFormData({ ...formData, version: parseInt(e.target.value) || 1 })} className="h-8 text-sm tabular-nums" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditDoc(null); setFormData(emptyForm); }}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={!formData.name || createMutation.isPending}>
              {createMutation.isPending ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Version History Panel (rendered outside the main layout)
  const versionHistoryPanel = versionHistoryDoc && (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setVersionHistoryDoc(null)}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DocumentVersionHistory
          documentId={versionHistoryDoc.id}
          documentName={versionHistoryDoc.name}
          currentVersion={versionHistoryDoc.version}
          onClose={() => setVersionHistoryDoc(null)}
        />
      </div>
    </div>
  );

  return (
    <>
      {mainContent}
      {versionHistoryPanel}
    </>
  );
}
