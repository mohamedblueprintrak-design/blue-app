"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, getErrorMessage, type ProjectFormData } from "@/lib/validations";
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
import dynamic from "next/dynamic";
import { AlertCircle, HardHat } from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamic import for MapPicker to avoid SSR crash (react-leaflet requires window)
const MapPicker = dynamic(() => import("@/components/ui/map-picker"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-sm" style={{ height: "300px" }}>
      جارٍ تحميل الخريطة...
    </div>
  ),
});

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAr: boolean;
  t: (ar: string, en: string) => string;
  clientsData: Array<{ id: string; name: string; company: string }>;
  contractorsData: Array<{ id: string; name: string; companyName: string; category: string }>;
  onSubmit: (data: ProjectFormData, mapLocation: { lat: number; lng: number } | null) => void;
  isPending: boolean;
}

export default function ProjectFormDialog({
  open,
  onOpenChange,
  isAr,
  t,
  clientsData,
  contractorsData,
  onSubmit,
  isPending,
}: ProjectFormDialogProps) {
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- zodResolver + react-hook-form type mismatch
    defaultValues: {
      number: "",
      name: "",
      nameEn: "",
      clientId: "",
      contractorId: "",
      location: "",
      plotNumber: "",
      type: "VILLA",
      budget: "",
      startDate: "",
      endDate: "",
      description: "",
    },
  });
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset } = form;

  const handleFormSubmit = (data: ProjectFormData) => {
    onSubmit(data, mapLocation);
    reset();
    setMapLocation(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { reset(); setMapLocation(null); } onOpenChange(isOpen); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("مشروع جديد", "New Project")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={rhfHandleSubmit(handleFormSubmit as (data: unknown) => void)} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("رقم المشروع", "Project Number")}</Label>
              <Input {...register("number")} placeholder={t("PRJ-001", "PRJ-001")} className={cn(errors.number && "border-red-500 focus:ring-red-500/20 focus:border-red-500")} />
              {errors.number && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.number.message || "", isAr)}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t("النوع", "Type")}</Label>
              {/* eslint-disable-next-line react-hooks/incompatible-library */}
              <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v)}>
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
            <Input {...register("name")} placeholder={isAr ? "اسم المشروع بالعربي" : "Project name in Arabic"} dir="rtl" className={cn(errors.name && "border-red-500 focus:ring-red-500/20 focus:border-red-500")} />
            {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.name.message || "", isAr)}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("اسم المشروع (إنجليزي)", "Project Name (English)")}</Label>
            <Input {...register("nameEn")} placeholder={isAr ? "Project name in English" : "Project name in English"} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>{t("العميل", "Client")}</Label>
            <Select value={form.watch("clientId")} onValueChange={(v) => form.setValue("clientId", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("اختر العميل", "Select client")} />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(clientsData) ? clientsData : []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.company ? `— ${c.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.clientId.message || "", isAr)}</p>}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <HardHat className="h-3.5 w-3.5 text-amber-500" />
              {t("المقاول (اختياري)", "Contractor (Optional)")}
            </Label>
            <Select value={form.watch("contractorId") || ""} onValueChange={(v) => form.setValue("contractorId", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("اختر المقاول المنفذ", "Select executing contractor")} />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(contractorsData) ? contractorsData : []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName || c.name} {c.category ? `— ${c.category}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("الموقع", "Location")}</Label>
            <Input {...register("location")} placeholder={isAr ? "رأس الخيمة" : "Ras Al Khaimah"} className={cn(errors.location && "border-red-500 focus:ring-red-500/20 focus:border-red-500")} />
            {errors.location && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.location.message || "", isAr)}</p>}
          </div>
          <div className="space-y-2">
            <MapPicker
              value={mapLocation}
              onChange={(v) => setMapLocation(v)}
              label={t("موقع المشروع على الخريطة", "Project Location on Map")}
              height="250px"
            />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "رقم القسيمة" : "Plot Number"}</Label>
            <Input {...register("plotNumber")} placeholder={isAr ? "مثال: RKN-LOT-4521" : "e.g. RKN-LOT-4521"} />
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
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isPending
              ? t("جارٍ الحفظ...", "Saving...")
              : t("إنشاء المشروع", "Create Project")}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

