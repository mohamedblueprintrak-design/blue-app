"use client";

import React from "react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 border border-slate-100 dark:border-slate-800 flex flex-col items-center transition-all duration-300">
        
        {/* Decorative offline icon with rich gradient */}
        <div className="relative w-24 h-24 mb-6 rounded-full bg-linear-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 dark:shadow-rose-500/10">
          <svg
            className="w-12 h-12 text-white animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 4.978 4.978 0 011.414-3.536m0 0L11.3 11.3M8.464 15.536L3 21M3 3l18 18"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          أنت غير متصل بالإنترنت
        </h1>
        <h2 className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-6">
          You are offline
        </h2>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          يرجى التحقق من اتصالك بالشبكة والمحاولة مرة أخرى. يمكنك استخدام الميزات المخزنة مؤقتاً في التطبيق.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 leading-relaxed">
          Please check your internet connection and try again. You can continue using cached application data.
        </p>

        {/* Action Button */}
        <button
          onClick={() => typeof window !== "undefined" && window.location.reload()}
          className="w-full py-3 px-6 bg-slate-900 dark:bg-slate-50 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-semibold shadow-md transition-all duration-200 cursor-pointer"
        >
          إعادة المحاولة / Retry
        </button>


        {/* Link back home if possible */}
        <Link
          href="/"
          className="mt-4 text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors duration-200"
        >
          العودة للرئيسية / Return Home
        </Link>
      </div>
    </div>
  );
}
