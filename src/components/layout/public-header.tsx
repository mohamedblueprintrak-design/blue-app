"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Calculator, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoImage from "@/components/ui/logo-image";
import { useLanguage } from "@/hooks/use-lang";
import { SkipNavLink } from "@/components/common/accessible-components";

const NAV_LINKS = [
  { href: "/", labelAr: "الرئيسية", labelEn: "Home" },
  { href: "/services", labelAr: "خدماتنا", labelEn: "Services" },
  { href: "/about", labelAr: "من نحن", labelEn: "About" },
  { href: "/calculator", labelAr: "حاسبة التكاليف", labelEn: "Calculator" },
  { href: "/quote", labelAr: "طلب عرض سعر", labelEn: "Get a Quote" },
];

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang: language } = useLanguage();
  const [languageState, setLanguageState] = useState<"ar" | "en">(language);

  useEffect(() => {
    const saved = localStorage.getItem("blueprint-lang");
    if (saved === "ar" || saved === "en") {
       
      setLanguageState(saved);
    }
  }, []);

  const [scrolled, setScrolled] = useState(false);
  const currentLang = languageState;

  useEffect(() => {
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const toggleLanguage = () => {
    const newLang = currentLang === "ar" ? "en" : "ar";
    setLanguageState(newLang);
    localStorage.setItem("blueprint-lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
    window.dispatchEvent(new Event("blueprint-lang-change"));
  };

  const t = (ar: string, en: string) => (currentLang === "ar" ? ar : en);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <SkipNavLink lang={currentLang} />
      <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/[0.97] backdrop-blur-xl shadow-[0_1px_3px_rgba(15,37,87,0.06)] border-b border-blue-100/50"
          : "bg-white/80 backdrop-blur-lg border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <LogoImage size={36} />
            <div>
              <h1 className="text-lg font-bold text-[#0A1628]">BluePrint</h1>
              <p className="text-[10px] text-[#4A6FA5] font-medium">
                {t("مكتب الاستشارات الهندسية", "Engineering Consultancy")}
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-[#4A6FA5] hover:text-[#0F2557] hover:bg-[#EFF6FF] rounded-lg transition-all duration-200 font-medium"
              >
                {t(link.labelAr, link.labelEn)}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4A6FA5] hover:text-[#0F2557] bg-[#EFF6FF]/60 hover:bg-[#EFF6FF] rounded-full transition-all duration-200 border border-transparent hover:border-blue-200/50"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === "ar" ? "EN" : "عربي"}
            </button>
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] hover:from-[#1A4A8B] hover:to-[#2563EB] text-white shadow-[0_4px_20px_rgba(15,37,87,0.3)] rounded-full px-6 h-10 text-sm font-semibold transition-all duration-300 hover:scale-105">
                <Calculator className="w-4 h-4 me-1.5" />
                {t("لوحة التحكم", "Dashboard")}
              </Button>
            </Link>
          </div>

          {/* Mobile: Language Toggle + Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleLanguage}
              className="p-2 text-[#4A6FA5] hover:text-[#0F2557] transition-colors rounded-lg hover:bg-[#EFF6FF]"
              aria-label={t("تغيير اللغة", "Toggle Language")}
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#0A1628] transition-colors"
              aria-label={t("القائمة", "Menu")}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-blue-100/50 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm text-[#4A6FA5] hover:text-[#0F2557] hover:bg-[#EFF6FF] rounded-lg transition-all font-medium"
                >
                  {t(link.labelAr, link.labelEn)}
                </Link>
              ))}
              <div className="pt-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] text-white rounded-full h-11 font-semibold shadow-[0_4px_16px_rgba(15,37,87,0.2)]">
                    <Calculator className="w-4 h-4 me-1.5" />
                    {t("لوحة التحكم", "Dashboard")}
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
}
