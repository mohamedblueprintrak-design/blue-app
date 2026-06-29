"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { SkipNavContent } from "@/components/common/accessible-components";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <SkipNavContent />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">حدث خطأ غير متوقع</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.</p>
        </div>
        {error.digest && <p className="text-xs text-slate-400">Error ID: {error.digest}</p>}
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white gap-2">
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </Button>
          <Button variant="outline" onClick={() => router.push("/")} className="gap-2">
            <Home className="h-4 w-4" /> الصفحة الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
