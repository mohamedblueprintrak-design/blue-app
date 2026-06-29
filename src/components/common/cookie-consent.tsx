"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CookieIcon, ShieldCheckIcon, Settings2Icon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
  getConsentPreferences,
  setConsentPreferences,
  hasConsented,
  type CookieConsentPreferences,
  type CookieCategory,
} from "@/lib/cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [prefs, setPrefs] = useState<CookieConsentPreferences>(getConsentPreferences);
  const locale = useLocale();
  const t = useTranslations("cookieConsent");
  const consentCheckedRef = useRef(false);



  // Show banner after mount if user hasn't consented
  useEffect(() => {
    if (consentCheckedRef.current) return;
    consentCheckedRef.current = true;

    if (!hasConsented()) {
      const timer = setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const isAr = locale === "ar";

  const handleAcceptAll = useCallback(() => {
    const newPrefs: CookieConsentPreferences = {
      consented: true,
      timestamp: new Date().toISOString(),
      categories: {
        essential: true,
        analytics: true,
        marketing: true,
        functional: true,
      },
    };
    setConsentPreferences(newPrefs);
    setPrefs(newPrefs);
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleRejectNonEssential = useCallback(() => {
    const newPrefs: CookieConsentPreferences = {
      consented: true,
      timestamp: new Date().toISOString(),
      categories: {
        essential: true,
        analytics: false,
        marketing: false,
        functional: false,
      },
    };
    setConsentPreferences(newPrefs);
    setPrefs(newPrefs);
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleSaveSettings = useCallback(() => {
    const newPrefs: CookieConsentPreferences = {
      consented: true,
      timestamp: new Date().toISOString(),
      categories: { ...prefs.categories },
    };
    setConsentPreferences(newPrefs);
    setPrefs(newPrefs);
    setSettingsOpen(false);
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
  }, [prefs.categories]);

  const toggleCategory = useCallback(
    (category: CookieCategory) => {
      if (category === "essential") return; // Can't disable essential
      setPrefs((prev) => ({
        ...prev,
        categories: {
          ...prev.categories,
          [category]: !prev.categories[category],
        },
      }));
    },
    []
  );

  // Don't render during SSR or if not visible
  if (!visible) return null;

  return (
    <>
      {/* Cookie Consent Banner */}
      <div
        dir={isAr ? "rtl" : "ltr"}
        className={cn(
          "fixed bottom-0 inset-x-0 z-[100] transition-transform duration-300 ease-out",
          animateIn ? "translate-y-0" : "translate-y-full"
        )}
        role="region"
        aria-label={t("title")}
      >
        <div className="bg-[#133371] text-white shadow-2xl rounded-t-2xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Icon & Text */}
              <div className="flex items-start gap-3 flex-1">
                <div className="shrink-0 mt-0.5">
                  <CookieIcon className="h-6 w-6 text-white/80" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">
                      {t("weUseCookies")}
                    </p>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {t("description")}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className={cn(
                    "h-9 text-xs font-medium border-white/30 text-white hover:bg-white/10 hover:text-white",
                    "flex items-center gap-1.5"
                  )}
                >
                  <Settings2Icon className="h-3.5 w-3.5" />
                  {t("settings")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRejectNonEssential}
                  className={cn(
                    "h-9 text-xs font-medium border-white/30 text-white hover:bg-white/10 hover:text-white"
                  )}
                >
                  {t("rejectNonEssential")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAcceptAll}
                  className={cn(
                    "h-9 text-xs font-medium bg-white text-[#133371]",
                    "hover:bg-white/90 hover:text-[#133371]"
                  )}
                >
                  {t("acceptAll")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          dir={isAr ? "rtl" : "ltr"}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CookieIcon className="h-5 w-5" />
              {t("cookieSettings")}
            </DialogTitle>
            <DialogDescription>
              {t("settingsDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {(["essential", "analytics", "marketing", "functional"] as CookieCategory[]).map((catId) => {
              const isRequired = catId === "essential";
              return (
              <div
                key={catId}
                className={cn(
                  "flex items-start justify-between gap-4 rounded-lg border p-3",
                  isRequired
                    ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    : "border-slate-200 dark:border-slate-700"
                )}
              >
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {t(`categories.${catId}.label`)}
                    </p>
                    {isRequired && (
                      <span className="text-[10px] font-medium bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                        {t("required")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(`categories.${catId}.desc`)}
                  </p>
                </div>
                <Switch
                  checked={prefs.categories[catId]}
                  onCheckedChange={() => toggleCategory(catId)}
                  disabled={isRequired}
                  className={cn(
                    "mt-1",
                    isRequired && "opacity-60 cursor-not-allowed"
                  )}
                  aria-label={t(`categories.${catId}.label`)}
                />
              </div>
            )})}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRejectNonEssential}
              className="text-xs"
            >
              {t("rejectNonEssential")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSettings}
              className="text-xs"
            >
              {t("saveSettings")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
