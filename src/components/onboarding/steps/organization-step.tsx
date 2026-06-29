"use client";


import { useTranslations } from 'next-intl';
import { useLanguage } from "@/hooks/use-lang";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Briefcase, Users } from "lucide-react";
import type { OnboardingOrganizationData } from "../types";
import { INDUSTRY_OPTIONS, SIZE_OPTIONS } from "../types";

interface OrganizationStepProps {
  data: OnboardingOrganizationData;
  onChange: (data: Partial<OnboardingOrganizationData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function OrganizationStep({ data, onChange, onNext, onBack, onSkip }: OrganizationStepProps) {
  const tAuto = useTranslations();
  const { t, isAr } = useLanguage();

  const canContinue = data.companyName.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue) {
      onNext();
    }
  };

  return (
    <div className="flex flex-col items-center px-4 sm:px-8 py-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center mx-auto mb-3">
          <Building2 className="h-6 w-6 text-brand-navy-600 dark:text-brand-navy-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {t("إعداد المؤسسة", "Set Up Your Organization")}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("أخبرنا عن شركتك لتخصيص النظام لاحتياجاتك", "Tell us about your company to tailor the system to your needs")}
        </p>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="onboarding-company" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("اسم الشركة", "Company Name")} <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="onboarding-company"
              value={data.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
              placeholder={tAuto('auto.eGCreativeEngineeringOffice')}
              className="ps-10"
              onKeyDown={handleKeyDown}
              dir={isAr ? "rtl" : "ltr"}
              aria-required="true"
            />
          </div>
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("القطاع", "Industry")} <span className="text-xs text-slate-400">({t("اختياري", "optional")})</span>
          </Label>
          <Select
            value={data.industry}
            onValueChange={(value) => onChange({ industry: value })}
          >
            <SelectTrigger className="w-full" aria-label={t("اختر القطاع", "Select industry")}>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder={t("اختر القطاع", "Select industry")} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {isAr ? opt.ar : opt.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("حجم الشركة", "Company Size")} <span className="text-xs text-slate-400">({t("اختياري", "optional")})</span>
          </Label>
          <Select
            value={data.size}
            onValueChange={(value) => onChange({ size: value })}
          >
            <SelectTrigger className="w-full" aria-label={t("اختر حجم الشركة", "Select company size")}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder={t("اختر حجم الشركة", "Select company size")} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {isAr ? opt.ar : opt.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation */}
      <div className="w-full max-w-md mt-8 flex flex-col gap-2">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="w-full h-11 bg-gradient-to-r from-brand-navy-500 to-cyan-600 hover:from-brand-navy-600 hover:to-cyan-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t("التالي", "Next")}
        >
          {t("التالي", "Next")}
        </Button>
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={t("السابق", "Back")}
          >
            {t("السابق", "Back")}
          </button>
          <button
            onClick={onSkip}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={t("تخطي", "Skip")}
          >
            {t("تخطي", "Skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
