"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency as formatCurrencyMulti, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  LayoutTemplate,
  Plus,
  Play,
  Trash2,
  Pencil,
  Building2,
  Home,
  Factory,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Clock,
  ListChecks,
  Hash,
  Loader2,
  Coins,
} from "lucide-react";

// ==================== Types ====================

interface TemplateStage {
  name: string;
  nameAr?: string;
  order: number;
  tasks: TemplateTask[];
}

interface TemplateTask {
  title: string;
  titleAr?: string;
  description?: string;
  assigneeRole?: string;
  priority?: string;
  estimatedDays?: number;
}

interface ProjectTemplate {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  category?: string;
  icon?: string;
  defaultBudget?: number;
  defaultDurationDays?: number;
  currency: string;
  stages: string; // JSON
  stagesParsed?: TemplateStage[];
  taskCount?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

interface ClientOption {
  id: string;
  name: string;
  company?: string;
}

// ==================== Category Config ====================

const CATEGORIES = [
  { id: "all", labelEn: "All", labelAr: "الكل", icon: LayoutTemplate },
  { id: "RESIDENTIAL", labelEn: "Residential", labelAr: "سكني", icon: Home },
  { id: "COMMERCIAL", labelEn: "Commercial", labelAr: "تجاري", icon: Building2 },
  { id: "EDUCATIONAL", labelEn: "Educational", labelAr: "تعليمي", icon: GraduationCap },
  { id: "INDUSTRIAL", labelEn: "Industrial", labelAr: "صناعي", icon: Factory },
];

// ==================== Form Default ====================

const EMPTY_FORM = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  category: "RESIDENTIAL",
  icon: "📋",
  defaultBudget: "",
  defaultDurationDays: "",
  currency: "AED",
};

// ==================== Main Component ====================

interface ProjectTemplatesPageProps {
  isAr: boolean;
  userRole?: string;
}

export function ProjectTemplatesPage({ isAr, userRole }: ProjectTemplatesPageProps) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const isAdmin = userRole?.toUpperCase() === "ADMIN" || userRole?.toUpperCase() === "MANAGER";

  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Instantiate dialog state
  const [instantiateOpen, setInstantiateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectNameAr, setProjectNameAr] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [creating, setCreating] = useState(false);

  // Create/Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ProjectTemplate | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  // ==================== Data Loading ====================

  const loadTemplates = useCallback(async (cat: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (cat && cat !== "all") params.set("category", cat);
      const res = await fetch(`/api/project-templates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(() => data.data || []);
      }
    } catch {
      toast({ title: t("خطأ في تحميل القوالب", "Error loading templates"), variant: "destructive" });
    } finally {
      setLoading(() => false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients?limit=100");
      if (res.ok) {
        const data = await res.json();
        const clientList = (data.clients || data.data || []) as ClientOption[];
        setClients(() => clientList);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadTemplates(category);
  }, [category, loadTemplates]);

  useEffect(() => {
    if (instantiateOpen) loadClients();
  }, [instantiateOpen, loadClients]);

  // ==================== Handlers ====================

  const handleInstantiate = async () => {
    if (!selectedTemplate || !projectName || !clientId) return;
    try {
      setCreating(true);
      const res = await fetch(`/api/project-templates/${selectedTemplate.id}/instantiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          nameAr: projectNameAr || projectName,
          clientId,
          customizations: {},
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: t("تم إنشاء المشروع بنجاح", "Project created successfully"),
          description: t(
            `تم إنشاء ${data.data?.tasksCreated || 0} مهمة في ${data.data?.stagesCreated || 0} مراحل`,
            `Created ${data.data?.tasksCreated || 0} tasks in ${data.data?.stagesCreated || 0} stages`
          ),
        });
        setInstantiateOpen(false);
        setProjectName("");
        setProjectNameAr("");
        setClientId("");
        loadTemplates(category);
      } else {
        const err = await res.json();
        toast({
          title: t("خطأ في إنشاء المشروع", "Error creating project"),
          description: err.error?.message || "",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: t("خطأ في الاتصال", "Connection error"), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name) return;
    try {
      setSaving(true);
      const payload = {
        ...formData,
        defaultBudget: formData.defaultBudget ? parseFloat(formData.defaultBudget) : null,
        defaultDurationDays: formData.defaultDurationDays ? parseInt(formData.defaultDurationDays) : null,
        stages: editTemplate
          ? editTemplate.stages
          : JSON.stringify([{ name: "Stage 1", nameAr: "المرحلة 1", order: 1, tasks: [] }]),
      };

      const url = editTemplate
        ? `/api/project-templates/${editTemplate.id}`
        : "/api/project-templates";
      const method = editTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: editTemplate
            ? t("تم تحديث القالب بنجاح", "Template updated successfully")
            : t("تم إنشاء القالب بنجاح", "Template created successfully"),
        });
        setEditOpen(false);
        setEditTemplate(null);
        setFormData({ ...EMPTY_FORM });
        loadTemplates(category);
      } else {
        const err = await res.json();
        toast({ title: err.error?.message || t("خطأ", "Error"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("خطأ", "Error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t("هل أنت متأكد من حذف هذا القالب؟", "Are you sure you want to delete this template?"))) return;
    try {
      const res = await fetch(`/api/project-templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("تم حذف القالب", "Template deleted") });
        loadTemplates(category);
      }
    } catch {
      toast({ title: t("خطأ في الحذف", "Error deleting"), variant: "destructive" });
    }
  };

  const openInstantiateDialog = (tpl: ProjectTemplate) => {
    setSelectedTemplate(tpl);
    setProjectName(isAr ? (tpl.nameAr || tpl.name) : tpl.name);
    setProjectNameAr(tpl.nameAr || tpl.name);
    setClientId("");
    setInstantiateOpen(true);
  };

  const openCreateDialog = () => {
    setEditTemplate(null);
    setFormData({ ...EMPTY_FORM });
    setEditOpen(true);
  };

  const openEditDialog = (tpl: ProjectTemplate) => {
    setEditTemplate(tpl);
    setFormData({
      name: tpl.name || "",
      nameAr: tpl.nameAr || "",
      description: tpl.description || "",
      descriptionAr: tpl.descriptionAr || "",
      category: tpl.category || "RESIDENTIAL",
      icon: tpl.icon || "📋",
      defaultBudget: tpl.defaultBudget?.toString() || "",
      defaultDurationDays: tpl.defaultDurationDays?.toString() || "",
      currency: tpl.currency || "AED",
    });
    setEditOpen(true);
  };

  const parseStages = (tpl: ProjectTemplate): TemplateStage[] => {
    if (tpl.stagesParsed) return tpl.stagesParsed;
    try {
      return JSON.parse(tpl.stages || "[]");
    } catch {
      return [];
    }
  };

  // ==================== Render ====================

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("قوالب المشاريع", "Project Templates")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("ابدأ مشروعك من قالب جاهز لتوفير الوقت", "Start your project from a ready template to save time")}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 me-2" />
            {t("قالب جديد", "New Template")}
          </Button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex-wrap h-auto gap-1 bg-slate-100 dark:bg-slate-800 p-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs px-3 py-1.5"
            >
              <cat.icon className="h-3.5 w-3.5 me-1.5" />
              {isAr ? cat.labelAr : cat.labelEn}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <LayoutTemplate className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              {t("لا توجد قوالب في هذه الفئة", "No templates in this category")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const stages = parseStages(tpl);
            const isExpanded = expandedTemplate === tpl.id;

            return (
              <Card
                key={tpl.id}
                className={cn(
                  "transition-all hover:shadow-md border-slate-200 dark:border-slate-700",
                  isExpanded && "md:col-span-2 lg:col-span-3"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{tpl.icon || "📋"}</span>
                      <div>
                        <CardTitle className="text-lg">
                          {isAr ? (tpl.nameAr || tpl.name) : tpl.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {tpl.category && (
                            <Badge variant="secondary" className="text-xs">
                              {isAr
                                ? CATEGORIES.find((c) => c.id === tpl.category)?.labelAr || tpl.category
                                : CATEGORIES.find((c) => c.id === tpl.category)?.labelEn || tpl.category}
                            </Badge>
                          )}
                          {tpl.currency && tpl.currency !== "AED" && (
                            <Badge variant="outline" className="text-[10px]">
                              {tpl.currency}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-teal-600"
                            onClick={() => openEditDialog(tpl)}
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <CardDescription>
                    {isAr ? (tpl.descriptionAr || tpl.description) : tpl.description}
                  </CardDescription>

                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" />
                      <span>{tpl.taskCount || stages.reduce((s, st) => s + (st.tasks?.length || 0), 0)} {t("مهمة", "tasks")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      <span>{stages.length} {t("مراحل", "stages")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{tpl.usageCount} {t("استخدام", "uses")}</span>
                    </div>
                    {tpl.defaultBudget != null && tpl.defaultBudget > 0 && (
                      <div className="flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400">
                        {formatCurrencyMulti(tpl.defaultBudget, tpl.currency || "AED", isAr ? "ar" : "en")}
                      </div>
                    )}
                    {tpl.defaultDurationDays != null && tpl.defaultDurationDays > 0 && (
                      <div className="flex items-center gap-1">
                        <span>{tpl.defaultDurationDays} {t("يوم", "days")}</span>
                      </div>
                    )}
                  </div>

                  {/* Expand/Collapse Stages Preview */}
                  <button
                    className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline"
                    onClick={() => setExpandedTemplate(isExpanded ? null : tpl.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        {t("إخفاء المراحل", "Hide Stages")}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        {t("عرض المراحل", "View Stages")}
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3 max-h-96 overflow-y-auto">
                      {stages.map((stage, si) => (
                        <div key={si} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">
                              {stage.order}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {isAr ? (stage.nameAr || stage.name) : stage.name}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {stage.tasks?.length || 0} {t("مهمة", "tasks")}
                            </Badge>
                          </div>
                          <ul className="ms-7 space-y-0.5">
                            {stage.tasks?.map((task, ti) => (
                              <li key={ti} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                {isAr ? (task.titleAr || task.title) : task.title}
                                {task.estimatedDays && (
                                  <span className="text-[10px] text-slate-400">({task.estimatedDays}d)</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Use Template Button */}
                  <Button
                    className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => openInstantiateDialog(tpl)}
                  >
                    <Play className="h-4 w-4 me-2" />
                    {t("استخدام القالب", "Use Template")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Instantiate Dialog */}
      <Dialog open={instantiateOpen} onOpenChange={setInstantiateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("إنشاء مشروع من القالب", "Create Project from Template")}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate && (
                <>
                  {t(
                    `إنشاء مشروع جديد بناءً على "${selectedTemplate.nameAr || selectedTemplate.name}"`,
                    `Create a new project based on "${selectedTemplate.name}"`
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("اسم المشروع (عربي)", "Project Name (Arabic)")}</Label>
              <Input
                value={projectNameAr}
                onChange={(e) => setProjectNameAr(e.target.value)}
                dir="rtl"
                placeholder={t("اسم المشروع بالعربي", "Project name in Arabic")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("اسم المشروع (إنجليزي)", "Project Name (English)")}</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                dir="ltr"
                placeholder={t("اسم المشروع بالإنجليزي", "Project name in English")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("العميل", "Client")} *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر العميل", "Select client")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTemplate && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {t("ملخص القالب", "Template Summary")}
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">
                    {parseStages(selectedTemplate).length} {t("مراحل", "stages")}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {selectedTemplate.taskCount || parseStages(selectedTemplate).reduce((s, st) => s + (st.tasks?.length || 0), 0)} {t("مهمة", "tasks")}
                  </span>
                  {selectedTemplate.defaultDurationDays != null && selectedTemplate.defaultDurationDays > 0 && (
                    <span className="text-slate-600 dark:text-slate-300">
                      {selectedTemplate.defaultDurationDays} {t("يوم", "days")}
                    </span>
                  )}
                  {selectedTemplate.defaultBudget != null && selectedTemplate.defaultBudget > 0 && (
                    <span className="text-teal-600 dark:text-teal-400 font-medium">
                      {formatCurrencyMulti(selectedTemplate.defaultBudget, selectedTemplate.currency || "AED", isAr ? "ar" : "en")}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstantiateOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button
              onClick={handleInstantiate}
              disabled={!projectName || !clientId || creating}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 me-2" />
              )}
              {t("إنشاء المشروع", "Create Project")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTemplate
                ? t("تعديل القالب", "Edit Template")
                : t("قالب جديد", "New Template")}
            </DialogTitle>
            <DialogDescription>
              {editTemplate
                ? t("تعديل بيانات القالب", "Update template details")
                : t("إنشاء قالب مشروع جديد يمكن استخدامه لإنشاء مشاريع سريعاً", "Create a new project template that can be used to quickly create projects")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("الاسم (إنجليزي)", "Name (English)")} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("فيلا سكنية", "Residential Villa")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("الاسم (عربي)", "Name (Arabic)")}</Label>
                <Input
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  dir="rtl"
                  placeholder="فيلا سكنية"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("الفئة", "Category")}</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIDENTIAL">{t("سكني", "Residential")}</SelectItem>
                    <SelectItem value="COMMERCIAL">{t("تجاري", "Commercial")}</SelectItem>
                    <SelectItem value="EDUCATIONAL">{t("تعليمي", "Educational")}</SelectItem>
                    <SelectItem value="INDUSTRIAL">{t("صناعي", "Industrial")}</SelectItem>
                    <SelectItem value="INFRASTRUCTURE">{t("بنية تحتية", "Infrastructure")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("الرمز", "Icon")}</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🏠"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {t("العملة", "Currency")}
                </Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {isAr ? `${c.nameAr} (${c.symbol})` : `${c.name} (${c.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("الوصف (إنجليزي)", "Description (English)")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder={t("سير عمل التصميم والاعتماد...", "Complete design and approval workflow...")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("الوصف (عربي)", "Description (Arabic)")}</Label>
              <Textarea
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                rows={2}
                dir="rtl"
                placeholder="سير عمل التصميم والاعتماد..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("الميزانية الافتراضية", "Default Budget")}</Label>
                <Input
                  type="number"
                  value={formData.defaultBudget}
                  onChange={(e) => setFormData({ ...formData, defaultBudget: e.target.value })}
                  placeholder="150000"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("المدة الافتراضية (أيام)", "Default Duration (days)")}</Label>
                <Input
                  type="number"
                  value={formData.defaultDurationDays}
                  onChange={(e) => setFormData({ ...formData, defaultDurationDays: e.target.value })}
                  placeholder="180"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!formData.name || saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : editTemplate ? (
                <Pencil className="h-4 w-4 me-2" />
              ) : (
                <Plus className="h-4 w-4 me-2" />
              )}
              {editTemplate ? t("حفظ", "Save") : t("إنشاء", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
