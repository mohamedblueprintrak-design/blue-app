"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { SkipNavContent } from "@/components/common/accessible-components";

/**
 * Global Error Boundary
 * This catches errors that the root layout itself throws.
 * Unlike error.tsx, this wraps the ENTIRE page including the layout.
 * Must be a client component and must define its own <html> and <body> tags
 * since the root layout is not rendered when this boundary activates.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[GlobalError] Unhandled error:", error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- Error pages must embed their own fonts since the root layout is not rendered */}
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground font-[family-name:var(--font-ibm-plex-arabic)] min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <SkipNavContent />
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">حدث خطأ غير متوقع</h2>
            <p className="text-slate-500 text-sm">
              نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </p>
          </div>
          {error.digest && (
            <p className="text-xs text-slate-400">Error ID: {error.digest}</p>
          )}
          <div className="flex items-center justify-center gap-3">
            <Button onClick={reset} className="bg-stone-900 hover:bg-stone-800 text-white gap-2">
              <RefreshCw className="h-4 w-4" /> إعادة المحاولة
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")} className="gap-2">
              <Home className="h-4 w-4" /> الصفحة الرئيسية
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
