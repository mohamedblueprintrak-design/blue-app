"use client";

import { useLanguage } from "@/hooks/use-lang";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, User, Phone } from "lucide-react";
import type { OnboardingProfileData } from "../types";

interface ProfileStepProps {
  data: OnboardingProfileData;
  onChange: (data: Partial<OnboardingProfileData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function ProfileStep({ data, onChange, onNext, onBack, onSkip }: ProfileStepProps) {
  const { t, isAr } = useLanguage();
  const user = useAuthStore((s) => s.user);

  const displayName = data.name || user?.name || "";
  const displayAvatar = data.avatar || user?.avatar || "";
  const initials = displayName.charAt(0)?.toUpperCase() || "U";

  const handleAvatarChange = () => {
    // In a real app, this would open a file picker and upload to server.
    // For now, we generate a placeholder avatar URL.
    const seed = Math.random().toString(36).slice(2, 8);
    onChange({ avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=0d9488` });
  };

  const canContinue = data.name.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue) {
      onNext();
    }
  };

  return (
    <div className="flex flex-col items-center px-4 sm:px-8 py-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-3">
          <User className="h-6 w-6 text-teal-600 dark:text-teal-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {t("إعداد الملف الشخصي", "Set Up Your Profile")}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("أخبرنا عن نفسك لتخصيص تجربتك", "Tell us about yourself to personalize your experience")}
        </p>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar className="h-20 w-20 ring-4 ring-teal-100 dark:ring-teal-900/40">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarChange}
              className="absolute -bottom-1 -end-1 w-8 h-8 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shadow-md transition-colors"
              aria-label={t("تغيير الصورة", "Change avatar")}
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <span className="text-xs text-slate-400">{t("اختياري - اضغط لتغيير الصورة", "Optional — tap to change")}</span>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="onboarding-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("الاسم الكامل", "Full Name")} <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="onboarding-name"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={t("أدخل اسمك الكامل", "Enter your full name")}
              className="ps-10"
              onKeyDown={handleKeyDown}
              dir={isAr ? "rtl" : "ltr"}
              aria-required="true"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="onboarding-phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("رقم الهاتف", "Phone Number")} <span className="text-xs text-slate-400">({t("اختياري", "optional")})</span>
          </Label>
          <div className="relative">
            <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="onboarding-phone"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder={t("+966 5x xxx xxxx", "+966 5x xxx xxxx")}
              className="ps-10"
              type="tel"
              onKeyDown={handleKeyDown}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="w-full max-w-md mt-8 flex flex-col gap-2">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="w-full h-11 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
