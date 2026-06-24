"use client";


import { useTranslations } from 'next-intl';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FolderKanban, Users, ListChecks, Settings, X, Sparkles } from "lucide-react";
import LogoImage from "@/components/ui/logo-image";

interface WelcomeModalProps {
  language: "ar" | "en";
}

export default function WelcomeModal({ language }: WelcomeModalProps) {
  const tAuto = useTranslations();
  const [show, setShow] = useState(false);
  const ar = language === "ar";

  useEffect(() => {
    const welcomed = localStorage.getItem("blueprint-welcomed");
    if (!welcomed) {
      // Small delay for page to load first
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("blueprint-welcomed", "true");
    setShow(false);
  };

  if (!show) return null;

  const steps = [
    { icon: FolderKanban, ar: "إنشاء مشروعك الأول", en: "Create your first project" },
    { icon: Users, ar: "إضافة فريق العمل", en: "Add your team members" },
    { icon: ListChecks, ar: "تتبع المهام", en: "Track your tasks" },
    { icon: Settings, ar: "تخصيص الإعدادات", en: "Customize your settings" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-brand-navy-500 to-cyan-600 p-6 text-center border border-white/10">
          <button onClick={handleDismiss} className="absolute top-3 end-3 text-white/70 hover:text-white transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <LogoImage size={56} className="mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">{tAuto('auto.welcomeToBluePrint1')}</h2>
          <p className="text-sm text-white/80 mt-1">{tAuto('auto.engineeringConsultancyManagementSystem')}</p>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-brand-navy-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{tAuto('auto.getStartedBy')}</h3>
          </div>
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-brand-navy-50 dark:hover:bg-brand-navy-900/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{ar ? step.ar : step.en}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <Button onClick={handleDismiss} className="w-full bg-gradient-to-r from-brand-navy-500 to-cyan-600 hover:from-brand-navy-600 hover:to-cyan-700 text-white rounded-xl h-11 font-semibold">
            {tAuto('auto.getStarted')}
          </Button>
          <button onClick={handleDismiss} className="w-full text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-center py-1">
            {tAuto('auto.skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
