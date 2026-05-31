"use client";

import { useEffect, useRef } from "react";
import { useLang } from "@/hooks/use-lang";
import { useToast } from "@/hooks/use-toast";

const WELCOME_SHOWN_KEY = "blueprint-welcome-shown";

export default function WelcomeNotification() {
  const lang = useLang();
  const isAr = lang === "ar";
  const { toast } = useToast();
  const hasFired = useRef(false);

  useEffect(() => {
    // Only show once per session
    if (typeof window === "undefined") return;
    if (hasFired.current) return;
    if (sessionStorage.getItem(WELCOME_SHOWN_KEY)) return;

    hasFired.current = true;

    // Small delay to let the app fully render
    const timer = setTimeout(() => {
      sessionStorage.setItem(WELCOME_SHOWN_KEY, "true");

      toast({
        title: isAr ? "مرحباً بك في BluePrint! 🎉" : "Welcome to BluePrint! 🎉",
        description: isAr
          ? "اختر دوراً سريعاً أو أدخل بياناتك"
          : "Choose a quick role or enter your credentials",
        duration: 5000,
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [isAr, toast]);

  // This component doesn't render any visible UI itself
  // It triggers the toast as a side effect
  return null;
}
