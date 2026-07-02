"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale } from "next-intl";

export default function UnauthorizedPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 font-sans select-none">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-navy-500/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-amber-500" />
        
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
        </div>

        <h1 className="text-2xl font-bold mb-3 tracking-tight">
          {isAr ? "وصول غير مصرح به" : "Unauthorized Access"}
        </h1>

        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          {isAr 
            ? "عذراً، ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة. يرجى التواصل مع مدير النظام إذا كنت تعتقد أن هذا خطأ." 
            : "Sorry, you do not have sufficient permissions to access this page. Please contact your system administrator if you believe this is a mistake."}
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-navy-600 hover:bg-brand-navy-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-brand-navy-950/50 hover:shadow-brand-navy-500/20 cursor-pointer"
        >
          {isAr ? (
            <>
              <span>العودة للوحة التحكم</span>
              <ArrowLeft className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Back to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
