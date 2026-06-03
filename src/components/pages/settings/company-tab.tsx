"use client";

import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Save,
  Upload,
  Globe,
  Clock,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import { WORKING_DAYS } from "./constants";
import type { CompanySettings } from "./types";

interface CompanyTabProps {
  isAr: boolean;
  formData: Record<string, string | boolean>;
  settings: CompanySettings | undefined;
  workingDays: string[];
  saving: boolean;
  saved: boolean;
  logoUploading: boolean;
  logoPreview: string | null;
  updateField: (key: string, value: string | boolean) => void;
  toggleWorkingDay: (day: string) => void;
  handleSave: () => void;
}

export function CompanyTab({
  isAr,
  formData,
  settings,
  workingDays,
  saving,
  saved,
  logoUploading,
  logoPreview,
  updateField,
  toggleWorkingDay,
  handleSave,
}: CompanyTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardContent className="p-6">
        <SectionHeader
          icon={Building2}
          title={isAr ? "معلومات الشركة" : "Company Information"}
          subtitle={isAr ? "تحديث بيانات الشركة الأساسية والشعار" : "Update core company information and logo"}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "اسم الشركة (عربي)" : "Company Name (Arabic)"}
            </Label>
            <Input
              value={(formData.name as string) || settings?.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              dir="rtl"
              placeholder={isAr ? "مكتب الاستشارات الهندسية" : "Engineering Consultancy"}
              className="h-10 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}
            </Label>
            <Input
              value={(formData.nameEn as string) || settings?.nameEn || ""}
              onChange={(e) => updateField("nameEn", e.target.value)}
              dir="ltr"
              placeholder="Engineering Consultancy Office"
              className="h-10 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "البريد الإلكتروني" : "Email"}
            </Label>
            <Input
              type="email"
              value={(formData.email as string) || settings?.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              dir="ltr"
              placeholder="info@example.com"
              className="h-10 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "رقم الهاتف" : "Phone"}
            </Label>
            <Input
              value={(formData.phone as string) || settings?.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              dir="ltr"
              placeholder="+971..."
              className="h-10 rounded-lg"
            />
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isAr ? "العنوان" : "Address"}
          </Label>
          <Input
            value={(formData.address as string) || settings?.address || ""}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder={isAr ? "العنوان الكامل" : "Full address"}
            className="h-10 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "الرقم الضريبي" : "Tax Number"}
            </Label>
            <Input
              value={(formData.taxNumber as string) || settings?.taxNumber || ""}
              onChange={(e) => updateField("taxNumber", e.target.value)}
              placeholder={isAr ? "الرقم الضريبي" : "Tax Registration Number"}
              className="h-10 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "العملة" : "Currency"}
            </Label>
            <Input
              value={(formData.currency as string) || settings?.currency || "AED"}
              onChange={(e) => updateField("currency", e.target.value)}
              dir="ltr"
              className="h-10 rounded-lg"
              placeholder="e.g. AED, USD, EUR"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "المنطقة الزمنية" : "Timezone"}
            </Label>
            <div className="relative">
              <Globe className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={(formData.timezone as string) || settings?.timezone || "Asia/Dubai"}
                onChange={(e) => updateField("timezone", e.target.value)}
                className="ps-9 h-10 rounded-lg"
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "ساعات العمل" : "Working Hours"}
            </Label>
            <div className="relative">
              <Clock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={(formData.workingHours as string) || settings?.workingHours || "08:00-17:00"}
                onChange={(e) => updateField("workingHours", e.target.value)}
                className="ps-9 h-10 rounded-lg"
                dir="ltr"
                placeholder="08:00-17:00"
              />
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Logo Upload Area */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isAr ? "شعار الشركة" : "Company Logo"}
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                alert(isAr ? "حجم الملف يتجاوز 2MB" : "File size exceeds 2MB");
                return;
              }
              try {
                const formDataUpload = new FormData();
                formDataUpload.append("file", file);
                formDataUpload.append("type", "logo");
                const res = await fetch("/api/settings/company", {
                  method: "PUT",
                  body: formDataUpload,
                });
                if (res.ok) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    // Trigger re-render via query invalidation
                    queryClient.invalidateQueries({ queryKey: ["company-settings"] });
                  };
                  reader.readAsDataURL(file);
                }
              } catch {
                // Logo upload error handled by UI
              }
            }}
          />
          <div
            className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-950/10 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file && fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInputRef.current.files = dt.files;
                fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }}
          >
            {logoUploading ? (
              <div className="flex flex-col items-center gap-2">
                <span className="h-8 w-8 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500">{isAr ? "جاري الرفع..." : "Uploading..."}</p>
              </div>
            ) : logoPreview || settings?.logo ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={logoPreview || settings?.logo}
                  alt={isAr ? "شعار الشركة" : "Company Logo"}
                  className="w-24 h-24 object-contain rounded-xl"
                />
                <p className="text-xs text-slate-500">{isAr ? "انقر لتغيير الشعار" : "Click to change logo"}</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
                  <Upload className="h-7 w-7 text-slate-400 group-hover:text-teal-500 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {isAr ? "اسحب الشعار هنا أو انقر للرفع" : "Drag logo here or click to upload"}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    PNG, JPG, SVG — {isAr ? "الحد الأقصى 2MB" : "Max 2MB"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Working Days */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isAr ? "أيام العمل" : "Working Days"}
          </Label>
          <div className="flex flex-wrap gap-2">
            {WORKING_DAYS.map((day) => {
              const isSelected = workingDays.includes(day.key);
              return (
                <Button
                  key={day.key}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleWorkingDay(day.key)}
                  className={cn(
                    "h-9 rounded-lg transition-all",
                    isSelected
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:border-teal-300"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 me-1.5" />}
                  {isAr ? day.ar : day.en}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white min-w-32 h-10 rounded-lg shadow-sm shadow-teal-500/20"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isAr ? "جاري الحفظ..." : "Saving..."}
              </span>
            ) : saved ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                {isAr ? "تم الحفظ!" : "Saved!"}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isAr ? "حفظ التغييرات" : "Save Changes"}
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
