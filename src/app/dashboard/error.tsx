"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { useTranslations } from "next-intl";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("errorLoadingData")}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{t("errorLoadingDashboard")}</p>
        <Button onClick={reset} className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white gap-2">
          <RefreshCw className="h-4 w-4" /> {t("retry")}
        </Button>
      </div>
    </div>
  );
}
