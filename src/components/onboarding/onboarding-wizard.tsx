"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-lang";
import { useAuthStore } from "@/store/auth-store";
import { X } from "lucide-react";
import WelcomeStep from "./steps/welcome-step";
import ProfileStep from "./steps/profile-step";
import OrganizationStep from "./steps/organization-step";
import PreferencesStep from "./steps/preferences-step";
import CompleteStep from "./steps/complete-step";
import {
  type OnboardingStep,
  type OnboardingData,
  INITIAL_ONBOARDING_DATA,
  STEP_COUNT,
} from "./types";

interface OnboardingWizardProps {
  language: "ar" | "en";
  onComplete: () => void;
}

const STEP_LABELS = [
  { ar: "مرحباً", en: "Welcome" },
  { ar: "الملف الشخصي", en: "Profile" },
  { ar: "المؤسسة", en: "Organization" },
  { ar: "التفضيلات", en: "Preferences" },
  { ar: "تم", en: "Complete" },
];

export default function OnboardingWizard({ language, onComplete }: OnboardingWizardProps) {
  const { t, isAr } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [data, setData] = useState<OnboardingData>({
    ...INITIAL_ONBOARDING_DATA,
    profile: {
      name: user?.name || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
    },
    preferences: {
      ...INITIAL_ONBOARDING_DATA.preferences,
      language,
    },
  });

  // Apply language change when preferences change
  useEffect(() => {
    if (data.preferences.language !== language) {
      localStorage.setItem("blueprint-lang", data.preferences.language);
      document.documentElement.dir = data.preferences.language === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = data.preferences.language;
      window.dispatchEvent(new Event("blueprint-lang-change"));
    }
  }, [data.preferences.language, language]);

  const updateProfile = useCallback((partial: Partial<OnboardingData["profile"]>) => {
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...partial } }));
  }, []);

  const updateOrganization = useCallback((partial: Partial<OnboardingData["organization"]>) => {
    setData((prev) => ({ ...prev, organization: { ...prev.organization, ...partial } }));
  }, []);

  const updatePreferences = useCallback((partial: Partial<OnboardingData["preferences"]>) => {
    setData((prev) => ({ ...prev, preferences: { ...prev.preferences, ...partial } }));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, STEP_COUNT - 1) as OnboardingStep);
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0) as OnboardingStep);
  }, []);

  const handleSkip = useCallback(() => {
    // Skip to the complete step
    setCurrentStep(4);
  }, []);

  const handleComplete = useCallback(async () => {
    try {
      // Save onboarding data to the server
      const res = await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profile: data.profile,
          organization: data.organization,
          preferences: data.preferences,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        // Update local auth store with new user data if returned
        if (result.user) {
          updateUser(result.user);
        }
      }
    } catch {
      // Non-critical — complete onboarding locally even if API fails
    }

    // Mark onboarding as completed in localStorage as a fallback
    localStorage.setItem("blueprint-onboarding-completed", "true");

    onComplete();
  }, [data, onComplete, updateUser]);

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? (isAr ? -60 : 60) : isAr ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? (isAr ? -60 : 60) : isAr ? 60 : -60,
      opacity: 0,
    }),
  };

  // Track direction for animation
  const [direction, setDirection] = useState(0);

  const handleNext = useCallback(() => {
    setDirection(1);
    goNext();
  }, [goNext]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    goBack();
  }, [goBack]);

  // Render progress indicator
  const renderProgress = () => (
    <div className="px-6 pt-4 pb-2">
      <div className="flex items-center gap-1.5">
        {STEP_LABELS.map((label, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-brand-navy-500 text-white"
                      : isCurrent
                      ? "bg-brand-navy-100 dark:bg-brand-navy-900/40 text-brand-navy-600 dark:text-brand-navy-400 ring-2 ring-brand-navy-500"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? "✓" : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium hidden sm:block ${
                    isCurrent
                      ? "text-brand-navy-600 dark:text-brand-navy-400"
                      : "text-slate-400"
                  }`}
                >
                  {isAr ? label.ar : label.en}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 rounded-full transition-colors duration-300 ${
                    isCompleted ? "bg-brand-navy-500" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeStep
            onNext={handleNext}
            onSkip={handleSkip}
          />
        );
      case 1:
        return (
          <ProfileStep
            data={data.profile}
            onChange={updateProfile}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 2:
        return (
          <OrganizationStep
            data={data.organization}
            onChange={updateOrganization}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 3:
        return (
          <PreferencesStep
            data={data.preferences}
            onChange={updatePreferences}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return <CompleteStep onGoToDashboard={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("إعداد الحساب", "Account Setup")}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200/60 dark:border-slate-700/40"
      >
        {/* Close button (skip onboarding) */}
        {currentStep < 4 && (
          <button
            onClick={handleSkip}
            className="absolute top-4 end-4 z-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={t("إغلاق", "Close")}
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Progress indicator */}
        {renderProgress()}

        {/* Step content with transition */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
