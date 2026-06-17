"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useLang } from "@/hooks/use-lang";
import LoginPage from "@/components/auth/login-page";
import AppLayout from "@/components/layout/app-layout";
import LogoImage from "@/components/ui/logo-image";

/**
 * Dashboard Layout — التخطيط المشترك لصفحات لوحة التحكم
 * 
 * This layout wraps all dashboard pages with:
 * - Authentication check (redirect to login if not authenticated)
 * - App layout (sidebar, header, breadcrumbs)
 * - Language initialization
 * 
 * This replaces the old catch-all route pattern and enables
 * proper file-based routing under /dashboard/*
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const language = useLang();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("blueprint-lang") as "ar" | "en" | null;
    if (stored) {
      document.documentElement.dir = stored === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = stored;
    }
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center animate-pulse">
            <LogoImage size={40} />
          </div>
          <span className="text-sm text-white/60">BluePrint</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage language={language} />;
  }

  // File-based routing is now the default. Set NEXT_PUBLIC_FILE_ROUTING=false
  // to opt back into the legacy hash-based SPA routing (useful for debugging
  // or for environments where the new routing has not yet been validated).
  // When file-based routing is enabled, Next.js serves real URLs
  // (/dashboard/projects, /dashboard/clients, etc.) with proper SSR, deep
  // linking, and browser back/forward support.
  const useFileRouting = process.env.NEXT_PUBLIC_FILE_ROUTING !== "false";

  if (useFileRouting) {
    return (
      <AppLayout language={language} useFileRouting>
        {children}
      </AppLayout>
    );
  }

  // Legacy mode: render the SPA app layout (no children needed)
  return <AppLayout language={language} />;
}
