export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-600/20 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-48 mx-auto rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-4 w-32 mx-auto rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 animate-pulse">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
