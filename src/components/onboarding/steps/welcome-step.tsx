"use client";

import { useLanguage } from "@/hooks/use-lang";
import LogoImage from "@/components/ui/logo-image";
import { FolderKanban, Users, ListChecks, Shield, Sparkles } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  const { t, isAr } = useLanguage();

  const features = [
    {
      icon: FolderKanban,
      ar: "إدارة المشاريع الشاملة",
      en: "Complete Project Management",
    },
    {
      icon: Users,
      ar: "إدارة فرق العمل والعملاء",
      en: "Team & Client Management",
    },
    {
      icon: ListChecks,
      ar: "تتبع المهام والجداول الزمنية",
      en: "Task & Schedule Tracking",
    },
    {
      icon: Shield,
      ar: "أمان متقدم وصلاحيات مرنة",
      en: "Advanced Security & Permissions",
    },
  ];

  return (
    <div className="flex flex-col items-center text-center px-4 sm:px-8 py-6">
      {/* Logo & Welcome */}
      <div className="mb-8">
        <LogoImage size={72} className="mx-auto mb-6 shadow-lg shadow-brand-navy-500/20 rounded-2xl" />
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {t("مرحباً بك في BluePrint", "Welcome to BluePrint")}
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-md">
          {t(
            "نظام إدارة مكاتب الاستشارات الهندسية المتكامل. دعنا نساعدك في إعداد حسابك.",
            "The all-in-one engineering consultancy management system. Let us help you set up your account."
          )}
        </p>
      </div>

      {/* Feature highlights */}
      <div className="w-full max-w-md space-y-3 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-brand-navy-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("ما يمكنك فعله:", "What you can do:")}
          </h3>
        </div>
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-brand-navy-50 dark:hover:bg-brand-navy-900/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isAr ? feature.ar : feature.en}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="w-full max-w-md flex flex-col gap-2">
        <button
          onClick={onNext}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-brand-navy-500 to-cyan-600 hover:from-brand-navy-600 hover:to-cyan-700 text-white font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-navy-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          aria-label={t("لنبدأ الإعداد", "Let's get set up")}
        >
          {t("لنبدأ الإعداد", "Let's Get Set Up")}
        </button>
        <button
          onClick={onSkip}
          className="w-full text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-center py-2 transition-colors"
          aria-label={t("تخطي الإعداد", "Skip setup")}
        >
          {t("تخطي والإكمال لاحقاً", "Skip & complete later")}
        </button>
      </div>
    </div>
  );
}
