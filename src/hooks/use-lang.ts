import { useSyncExternalStore } from "react";
import { dictionaries, type DictionaryPath } from "@/lib/i18n/dictionaries";

// ===== Shared Language Hook =====
// Centralized language detection to avoid duplication across 10+ page components.

function getLangSnapshot(): "ar" | "en" {
  if (typeof window === "undefined") return "ar";
  return (localStorage.getItem("blueprint-lang") as "ar" | "en") || "ar";
}

function getServerSnapshot(): "ar" | "en" {
  return "ar";
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener("blueprint-lang-change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("blueprint-lang-change", cb);
  };
}

/**
 * Returns the current language from localStorage.
 * Usage: `const lang = useLang(); const ar = lang === "ar";`
 */
export function useLang(): "ar" | "en" {
  return useSyncExternalStore(subscribe, getLangSnapshot, getServerSnapshot);
}

/**
 * Extended language hook that also provides helper functions.
 * Usage: `const { lang, language, ar, isAr, t, toggleLanguage } = useLanguage();`
 */
export function useLanguage() {
  const lang = useLang();
  const ar = lang === "ar";
  
  /**
   * Translates a key path from the dictionary (e.g. "common.save")
   * or falls back to inline (arText, enText) if two string arguments are provided.
   */
  const t = (pathOrArText: string | DictionaryPath, enText?: string): string => {
    if (enText !== undefined) {
      return ar ? (pathOrArText as string) : enText;
    }
    
    // Resolve key path
    const parts = (pathOrArText as string).split(".");
    let current: unknown = dictionaries[lang];
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return pathOrArText as string; // Fallback to path if not found
      }
    }
    return typeof current === "string" ? current : (pathOrArText as string);
  };

  const toggleLanguage = () => {
    const next = lang === "ar" ? "en" : "ar";
    localStorage.setItem("blueprint-lang", next);
    document.cookie = `blueprint-lang=${next}; path=/; max-age=31536000`;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
    window.dispatchEvent(new Event("blueprint-lang-change"));
    // Refresh page to apply new language messages on the server
    window.location.reload();
  };
  
  return { lang, language: lang, ar, isAr: ar, t, toggleLanguage };
}

