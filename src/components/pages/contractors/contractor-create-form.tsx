"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, X, Building2, Award, Banknote, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import { RatingStars } from "./rating-stars";
import { emptyForm } from "./types";

// ===== Full-Page Create Form =====
function ContractorCreateForm({
  ar,
  formData,
  setFormData,
  saveMutation,
  onCancel,
}: {
  ar: boolean;
  formData: typeof emptyForm;
  setFormData: (d: typeof emptyForm) => void;
  saveMutation: { isPending: boolean; mutate: (data: typeof emptyForm) => void };
  onCancel: () => void;
}) {
  const tAuto = useTranslations();
  const update = (field: string, value: string) => setFormData({ ...formData, [field]: value });

  const inputCls = "h-9 text-sm rounded-lg border-slate-200 dark:border-slate-700 focus:border-brand-navy-500 focus:ring-2 focus:ring-brand-navy-500/20";
  const labelCls = "text-xs font-medium text-slate-600 dark:text-slate-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
            <Users className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {tAuto('auto.addNewContractor')}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {tAuto('auto.enterTheCompleteContractorProfile')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-slate-500" onClick={onCancel}>
          <X className="h-4 w-4 me-1" />{tAuto('auto.cancel')}
        </Button>
      </div>

      {/* Section 1: Basic Info */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-5 space-y-4">
          <SectionHeader icon={Building2} title={tAuto('auto.basicInformation')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.companyNameAr')} <span className="text-red-500">*</span></Label>
              <Input value={formData.name} onChange={(e) => update("name", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.companyNameEn')}</Label>
              <Input value={formData.nameEn} onChange={(e) => update("nameEn", e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.category')} <span className="text-red-500">*</span></Label>
              <Select value={formData.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger className={cn(inputCls)}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CIVIL">{tAuto('auto.civil')}</SelectItem>
                  <SelectItem value="ELECTRICAL">{tAuto('auto.electrical')}</SelectItem>
                  <SelectItem value="MEP">MEP</SelectItem>
                  <SelectItem value="FINISHING">{tAuto('auto.finishing')}</SelectItem>
                  <SelectItem value="PLUMBING">{tAuto('auto.plumbing')}</SelectItem>
                  <SelectItem value="HVAC">{tAuto('auto.hVAC')}</SelectItem>
                  <SelectItem value="general">{tAuto('auto.general')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.contactPerson')}</Label>
              <Input value={formData.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.phone')}</Label>
              <Input value={formData.phone} onChange={(e) => update("phone", e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.email')}</Label>
              <Input value={formData.email} onChange={(e) => update("email", e.target.value)} className={inputCls} dir="ltr" type="email" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Company Details */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-5 space-y-4">
          <SectionHeader icon={Award} title={tAuto('auto.companyDetails')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.cRNumber')}</Label>
              <Input value={formData.crNumber} onChange={(e) => update("crNumber", e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.licenseNumber')}</Label>
              <Input value={formData.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.licenseExpiry')}</Label>
              <Input type="date" value={formData.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.classification')}</Label>
              <Select value={formData.classification} onValueChange={(v) => update("classification", v)}>
                <SelectTrigger className={cn(inputCls)}><SelectValue placeholder={tAuto('auto.selectClassification')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">{tAuto('auto.1stClass')}</SelectItem>
                  <SelectItem value="second">{tAuto('auto.2ndClass')}</SelectItem>
                  <SelectItem value="third">{tAuto('auto.3rdClass')}</SelectItem>
                  <SelectItem value="fourth">{tAuto('auto.4thClass')}</SelectItem>
                  <SelectItem value="fifth">{tAuto('auto.5thClass')}</SelectItem>
                  <SelectItem value="special">{tAuto('auto.specialCategory')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.establishmentDate')}</Label>
              <Input type="date" value={formData.establishmentDate} onChange={(e) => update("establishmentDate", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.numberOfWorkers')}</Label>
              <Input type="number" value={formData.workerCount} onChange={(e) => update("workerCount", e.target.value)} className={inputCls} min="0" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.numberOfEngineers')}</Label>
              <Input type="number" value={formData.engineerCount} onChange={(e) => update("engineerCount", e.target.value)} className={inputCls} min="0" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.tradeLicenseNumber')}</Label>
              <Input value={formData.tradeLicense} onChange={(e) => update("tradeLicense", e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.tradeLicenseExpiry')}</Label>
              <Input type="date" value={formData.tradeLicenseExpiry} onChange={(e) => update("tradeLicenseExpiry", e.target.value)} className={inputCls} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Financial */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-5 space-y-4">
          <SectionHeader icon={Banknote} title={tAuto('auto.financialInformation')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.vATRegistrationNo')}</Label>
              <Input value={formData.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.bankName')}</Label>
              <Input value={formData.bankName} onChange={(e) => update("bankName", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>IBAN</Label>
              <Input value={formData.iban} onChange={(e) => update("iban", e.target.value)} className={cn(inputCls, "font-mono")} dir="ltr" placeholder="AE00 0000 0000 0000 0000 000" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Additional */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-5 space-y-4">
          <SectionHeader icon={Sparkles} title={tAuto('auto.additionalInformation')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rating - Interactive Stars */}
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.rating')}</Label>
              <div className="flex items-center gap-3">
                <RatingStars
                  rating={Number(formData.rating)}
                  size="md"
                  interactive
                  onRate={(r) => update("rating", String(r))}
                />
                <span className="text-sm text-slate-500">{formData.rating}/5</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>{tAuto('auto.specialties')}</Label>
              <Input
                value={formData.specialties}
                onChange={(e) => update("specialties", e.target.value)}
                className={inputCls}
                placeholder={tAuto('auto.commaSeparatedEGVillasBuildings')}
              />
              {formData.specialties && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {formData.specialties.split(",").filter(Boolean).map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{s.trim()}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={labelCls}>{tAuto('auto.experienceDescription')}</Label>
              <Textarea
                value={formData.experience}
                onChange={(e) => update("experience", e.target.value)}
                className={cn(inputCls, "min-h-[80px]")}
                placeholder={tAuto('auto.briefAboutTheContractorSExperienceAndPas')}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={labelCls}>{tAuto('auto.notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => update("notes", e.target.value)}
                className={cn(inputCls, "min-h-[60px]")}
                placeholder={tAuto('auto.anyAdditionalNotes')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <Button variant="outline" className="h-9 rounded-lg" onClick={onCancel}>
          {tAuto('auto.cancel')}
        </Button>
        <Button
          className="h-9 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20 min-w-[120px]"
          onClick={() => saveMutation.mutate(formData)}
          disabled={!formData.name || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {tAuto('auto.saving')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {tAuto('auto.addContractor')}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export { ContractorCreateForm };
