import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

// ===== Shared Language Hook =====
// Centralized language detection to avoid duplication across 10+ page components.
// Uses next-intl's useLocale() as the source of truth — it reads the
// blueprint-lang cookie on the server side, preventing hydration mismatch
// (the old useSyncExternalStore approach always returned "ar" on the server,
// causing a flash of Arabic content when the user's language is English).

/**
 * Returns the current language, synced with next-intl's locale system.
 * Usage: `const lang = useLang(); const ar = lang === "ar";`
 */
export function useLang(): "ar" | "en" {
  const locale = useLocale();
  return (locale === "en" ? "en" : "ar") as "ar" | "en";
}

/**
 * Extended language hook that also provides helper functions.
 * Usage: `const { lang, language, ar, isAr, t, toggleLanguage } = useLanguage();`
 *
 * SECURITY FIX: Removed dependency on src/lib/i18n/dictionaries.ts.
 * The dictionary-based t("common.save") path resolution was never used —
 * all callers use the inline mode: t("arabic text", "english text").
 * The dictionaries.ts file (222 lines) was dead code duplicating
 * messages/{ar,en}.json content.
 *
 * For new code, prefer useTranslations() from next-intl directly:
 *   const tAuto = useTranslations();
 *   tAuto('auto.someKey')
 */
export function useLanguage() {
  const lang = useLang();
  const ar = lang === "ar";
  const router = useRouter();

  /**
   * Inline translation helper.
   * Usage: t("arabic text", "english text")
   *
   * For dictionary-based translations, use useTranslations() from next-intl
   * with keys from messages/{ar,en}.json instead.
   */
  const t = (arText: string, enText: string): string => {
    return ar ? arText : enText;
  };

  const toggleLanguage = () => {
    const next = lang === "ar" ? "en" : "ar";
    localStorage.setItem("blueprint-lang", next);
    document.cookie = `blueprint-lang=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
    window.dispatchEvent(new Event("blueprint-lang-change"));
    router.refresh();
  };

  return { lang, language: lang, ar, isAr: ar, t, toggleLanguage };
}
