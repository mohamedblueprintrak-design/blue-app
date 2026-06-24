"use client";


import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, HardHat, LayoutTemplate, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { ProjectFormData } from "@/lib/validations";
import { getErrorMessage } from "@/lib/validations";
import { useToast } from "@/hooks/use-toast";

// Dynamic import for MapPicker to avoid SSR crash (react-leaflet requires window)
const MapPicker = dynamic(() => import("@/components/ui/map-picker"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-sm" style={{ height: "300px" }}>
      جارٍ تحميل الخريطة...
    </div>
  ),
});

// Template type for the picker
interface TemplateOption {
  id: string;
  name: string;
  nameAr?: string;
  icon?: string;
  category?: string;
  taskCount?: number;
}

interface AddProjectDialogProps {
  isAr: boolean;
  t: (ar: string, en: string) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReturnType<typeof import("react-hook-form").useForm<ProjectFormData>>;
  mapLocation: { lat: number; lng: number } | null;
  onMapLocationChange: (v: { lat: number; lng: number } | null) => void;
  onSubmit: (data: ProjectFormData) => void;
  createMutationPending: boolean;
  clientsData: unknown[];
  contractorsData: unknown[];
}

export function AddProjectDialog({
  isAr,
  t,
  open,
  onOpenChange,
  form,
  mapLocation,
  onMapLocationChange,
  onSubmit,
  createMutationPending,
  clientsData,
  contractorsData,
}: AddProjectDialogProps) {
  const tAuto = useTranslations();
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, setValue, watch } = form;

  // Template picker state
  const [useTemplate, setUseTemplate] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  const { toast: _toast } = useToast();

  // Fetch templates when template mode is enabled
  const fetchTemplates = useCallback(async () => {
    if (templatesLoaded) return;
    try {
      const res = await fetch("/api/project-templates");
      if (res.ok) {
        const data = await res.json();
        const list = (data.data || []) as Array<{
          id: string; name: string; nameAr?: string; icon?: string; category?: string; taskCount?: number;
          stagesParsed?: Array<{ tasks?: unknown[] }>; stages?: string;
        }>;
        setTemplates(
          list.map((tpl) => ({
            id: tpl.id,
            name: tpl.name,
            nameAr: tpl.nameAr,
            icon: tpl.icon,
            category: tpl.category,
            taskCount: tpl.taskCount || 0,
          }))
        );
        setTemplatesLoaded(true);
      }
    } catch { /* non-critical */ }
  }, [templatesLoaded]);

  useEffect(() => {
    if (useTemplate && open) fetchTemplates();  
  }, [useTemplate, open, fetchTemplates]);

  // When template is selected, auto-fill type based on category
  useEffect(() => {
    if (selectedTemplateId) {
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      if (tpl?.category) {
        const typeMap: Record<string, string> = {
          RESIDENTIAL: "VILLA",
          COMMERCIAL: "COMMERCIAL",
          INDUSTRIAL: "INDUSTRIAL",
          EDUCATIONAL: "BUILDING",
          INFRASTRUCTURE: "BUILDING",
        };
        setValue("type", typeMap[tpl.category] || "VILLA");
      }
    }
  }, [selectedTemplateId, templates, setValue]);

  return (
    <Dialog open={open} onOpenChange={(openVal) => { if (!openVal) { reset(); onMapLocationChange(null); setUseTemplate(false); setSelectedTemplateId(""); } onOpenChange(openVal); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("مشروع جديد", "New Project")}</DialogTitle>
        </DialogHeader>

        {/* Template toggle */}
        <div className="flex items-center gap-2 p-3 rounded-lg border border-brand-navy-200 dark:border-brand-navy-800 bg-brand-navy-50/50 dark:bg-brand-navy-950/20">
          <LayoutTemplate className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400 shrink-0" />
          <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">
            {t("ابدأ من قالب جاهز", "Start from a template")}
          </span>
          <Button
            variant={useTemplate ? "default" : "outline"}
            size="sm"
            className={cn("h-7 text-xs", useTemplate && "bg-brand-navy-600 hover:bg-brand-navy-700 text-white")}
            onClick={() => setUseTemplate(!useTemplate)}
          >
            {useTemplate ? t("مفعّل", "Enabled") : t("تفعيل", "Enable")}
          </Button>
        </div>

        {/* Template Picker */}
        {useTemplate && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LayoutTemplate className="h-3.5 w-3.5 text-brand-navy-600" />
              {t("اختر القالب", "Select Template")}
            </Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder={t("اختر قالب المشروع", "Choose a project template")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    <span className="flex items-center gap-2">
                      <span>{tpl.icon}</span>
                      <span>{isAr ? (tpl.nameAr || tpl.name) : tpl.name}</span>
                      {tpl.taskCount ? (
                        <span className="text-slate-400 text-xs flex items-center gap-0.5">
                          <ListChecks className="h-3 w-3" />{tpl.taskCount}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplateId && (
              <p className="text-xs text-brand-navy-600 dark:text-brand-navy-400">
                {t(
                  "سيتم إنشاء المراحل والمهام تلقائياً من القالب عند حفظ المشروع",
                  "Stages and tasks will be automatically created from the template when the project is saved"
                )}
              </p>
            )}
          </div>
        )}

        <form onSubmit={rhfHandleSubmit(onSubmit as (data: unknown) => void)} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("رقم المشروع", "Project Number")}</Label>
              <Input {...register("number")} placeholder={t("PRJ-001", "PRJ-001")} className={cn(errors.number && "border-red-500 focus:ring-red-500/20 focus:border-red-500")} />
              {errors.number && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.number.message || "", isAr)}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t("النوع", "Type")}</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger className={cn(errors.type && "border-red-500 focus:ring-red-500/20")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VILLA">{t("فيلا", "Villa")}</SelectItem>
                  <SelectItem value="BUILDING">{t("مبنى", "Building")}</SelectItem>
                  <SelectItem value="COMMERCIAL">{t("تجاري", "Commercial")}</SelectItem>
                  <SelectItem value="INDUSTRIAL">{t("صناعي", "Industrial")}</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.type.message || "", isAr)}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("اسم المشروع (عربي)", "Project Name (Arabic)")}</Label>
            <Input {...register("name")} placeholder={tAuto('auto.projectNameInArabic')} dir="rtl" className={cn(errors.name && "border-red-500 focus:ring-red-500/20 focus:border-red-500")} />
            {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.name.message || "", isAr)}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("اسم المشروع (إنجليزي)", "Project Name (English)")}</Label>
            <Input {...register("nameEn")} placeholder={tAuto('auto.projectNameInEnglish')} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>{t("العميل", "Client")}</Label>
            <Select value={watch("clientId")} onValueChange={(v) => setValue("clientId", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("اختر العميل", "Select client")} />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(clientsData) ? clientsData : []).map((c) => {
                  const client = c as { id: string; name: string; company?: string };
                  return (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.company ? `— ${client.company}` : ""}
                  </SelectItem>
                ); })}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.clientId.message || "", isAr)}</p>}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <HardHat className="h-3.5 w-3.5 text-amber-500" />
              {t("المقاول (اختياري)", "Contractor (Optional)")}
            </Label>
            <Select value={watch("contractorId") || ""} onValueChange={(v) => setValue("contractorId", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("اختر المقاول المنفذ", "Select executing contractor")} />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(contractorsData) ? contractorsData : []).map((c) => {
                  const contractor = c as { id: string; companyName?: string; name?: string; category?: string };
                  return (
                  <SelectItem key={contractor.id} value={contractor.id}>
                    {contractor.companyName || contractor.name} {contractor.category ? `— ${contractor.category}` : ""}
                  </SelectItem>
                ); })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("الموقع", "Location")}</Label>
            <Input {...register("location")} placeholder={tAuto('auto.rasAlKhaimah')} className={cn(errors.location && "border-red-500 focus:ring-red-500/20 focus:border-red-500")} />
            {errors.location && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.location.message || "", isAr)}</p>}
          </div>
          <div className="space-y-2">
            <MapPicker
              value={mapLocation}
              onChange={onMapLocationChange}
              label={t("موقع المشروع على الخريطة", "Project Location on Map")}
              height="250px"
            />
          </div>
          <div className="space-y-2">
            <Label>{tAuto('auto.plotNumber')}</Label>
            <Input {...register("plotNumber")} placeholder={tAuto('auto.eGRKNLOT4521')} />
          </div>
          <div className="space-y-2">
            <Label>{t("الميزانية (AED)", "Budget (AED)")}</Label>
            <Input type="number" {...register("budget")} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("تاريخ البدء", "Start Date")}</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div className="space-y-2">
              <Label>{t("تاريخ الانتهاء", "End Date")}</Label>
              <Input type="date" {...register("endDate")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("الوصف", "Description")}</Label>
            <Textarea {...register("description")} rows={3} placeholder={t("وصف المشروع...", "Project description...")} />
          </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); setUseTemplate(false); setSelectedTemplateId(""); }}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={createMutationPending}
            className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
          >
            {createMutationPending
              ? t("جارٍ الحفظ...", "Saving...")
              : t("إنشاء المشروع", "Create Project")}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
