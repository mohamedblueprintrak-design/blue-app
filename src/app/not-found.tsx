import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowRight } from "lucide-react";
import { SkipNavContent } from "@/components/common/accessible-components";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <SkipNavContent />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-24 h-24 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <FileQuestion className="h-12 w-12 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-black text-slate-900 dark:text-white">404</h1>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">الصفحة غير موجودة</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2"><Home className="h-4 w-4" /> الصفحة الرئيسية</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">لوحة التحكم <ArrowRight className="h-4 w-4 rotate-180" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
