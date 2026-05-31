"use client";

import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw, ArrowRight } from "lucide-react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">خطأ في المصادقة</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            حدث خطأ أثناء عملية التحقق. يرجى المحاولة مرة أخرى.
          </p>
        </div>
        {error.digest && <p className="text-xs text-slate-400">Error ID: {error.digest}</p>}
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard")} className="gap-2">
            <ArrowRight className="h-4 w-4" /> العودة لتسجيل الدخول
          </Button>
        </div>
      </div>
    </div>
  );
}
