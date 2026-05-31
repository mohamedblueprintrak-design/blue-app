"use client";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" dir="rtl">
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">جارٍ التحقق...</p>
      </div>
    </div>
  );
}
