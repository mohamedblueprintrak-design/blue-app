"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useLang } from "@/hooks/use-lang";
import LoginPage from "@/components/auth/login-page";
import AppLayout from "@/components/layout/app-layout";
import LogoImage from "@/components/ui/logo-image";
// NOTE: SafeWebSocketProvider is already provided by the root layout (src/app/layout.tsx)
// Do NOT wrap AppLayout in another SafeWebSocketProvider here — it would create
// duplicate WebSocket connections and cause unexpected behavior.

function AppContent() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const language = useLang();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("blueprint-lang") as "ar" | "en" | null;
    if (stored) {
      document.documentElement.dir = stored === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = stored;
    }
    // Use requestAnimationFrame to avoid the cascading render warning
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

  return <AppLayout language={language} />;
}

export default function Home() {
  return <AppContent />;
}
