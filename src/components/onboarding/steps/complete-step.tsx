"use client";

import { useLanguage } from "@/hooks/use-lang";
import LogoImage from "@/components/ui/logo-image";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, ArrowLeft, PartyPopper } from "lucide-react";

interface CompleteStepProps {
  onGoToDashboard: () => void;
}

export default function CompleteStep({ onGoToDashboard }: CompleteStepProps) {
  const { t, isAr } = useLanguage();

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-col items-center text-center px-4 sm:px-8 py-6">
      {/* Success icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <PartyPopper className="absolute -top-2 -end-2 h-8 w-8 text-amber-500" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {t("أنت جاهز!", "You're All Set!")}
      </h2>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        {t(
          "تم إعداد حسابك بنجاح. يمكنك الآن البدء في استخدام BluePrint لإدارة مشاريعك وفريقك.",
          "Your account is set up successfully. You can now start using BluePrint to manage your projects and team."
        )}
      </p>

      {/* Quick tips */}
      <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
          {t("نصائح سريعة:", "Quick tips:")}
        </p>
        <ul className="space-y-1.5 text-start">
          <li className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-teal-500 shrink-0" />
            {t("أنشئ مشروعك الأول من لوحة التحكم", "Create your first project from the dashboard")}
          </li>
          <li className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-teal-500 shrink-0" />
            {t("أضد أعضاء الفريق من صفحة الموظفين", "Add team members from the Employees page")}
          </li>
          <li className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-teal-500 shrink-0" />
            {t("خصص إعداداتك أكثر من صفحة الإعدادات", "Customize more from the Settings page")}
          </li>
        </ul>
      </div>

      <LogoImage size={40} className="mb-6 opacity-60" />

      {/* Go to dashboard */}
      <Button
        onClick={onGoToDashboard}
        className="w-full max-w-sm h-12 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-xl text-base"
        aria-label={t("الانتقال إلى لوحة التحكم", "Go to Dashboard")}
      >
        {t("الانتقال إلى لوحة التحكم", "Go to Dashboard")}
        <ArrowIcon className="ms-2 h-5 w-5" />
      </Button>
    </div>
  );
}
