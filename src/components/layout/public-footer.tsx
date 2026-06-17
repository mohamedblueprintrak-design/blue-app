"use client";

import Link from "next/link";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import LogoImage from "@/components/ui/logo-image";
import { useLanguage } from "@/hooks/use-lang";
import { useState, useEffect } from "react";

const QUICK_LINKS = [
  { href: "/services", labelAr: "خدماتنا", labelEn: "Services" },
  { href: "/about", labelAr: "من نحن", labelEn: "About" },
  { href: "/calculator", labelAr: "حاسبة التكاليف", labelEn: "Cost Calculator" },
  { href: "/quote", labelAr: "طلب عرض سعر", labelEn: "Get a Quote" },
  { href: "/dashboard", labelAr: "لوحة التحكم", labelEn: "Dashboard" },
];

const SERVICE_LINKS = [
  { href: "/services#architectural-design", labelAr: "التصميم المعماري", labelEn: "Architectural Design" },
  { href: "/services#structural-design", labelAr: "التصميم الإنشائي", labelEn: "Structural Design" },
  { href: "/services#mep-design", labelAr: "التصميم الكهربائي والميكانيكي", labelEn: "Electrical & MEP Design" },
  { href: "/services#municipality-licenses", labelAr: "رخص البلدية والدفاع المدني", labelEn: "Municipality & Civil Defense" },
  { href: "/services#construction-supervision", labelAr: "إشراف التنفيذ", labelEn: "Construction Supervision" },
  { href: "/services#engineering-inspection", labelAr: "الفحص الهندسي", labelEn: "Engineering Inspection" },
];

export default function PublicFooter() {
  const { lang: language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  
  const [year] = useState(() => new Date().getFullYear());

  const [company, setCompany] = useState({
    phone: "+971 50 161 1234",
    email: "info.blueprintrak@gmail.com",
    address: "رأس الخيمة - الإمارات العربية المتحدة"
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/stats', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.company) {
          setCompany({
            phone: data.company.phone || "+971 50 161 1234",
            email: data.company.email || "info.blueprintrak@gmail.com",
            address: data.company.address || "رأس الخيمة - الإمارات العربية المتحدة"
          });
        }
      })
      .catch(err => { if (err.name !== 'AbortError') { /* ignore non-abort errors */ } });
    return () => controller.abort();
  }, []);

  return (
    <footer className="bg-[#060E1F] text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-white/[0.08]">
          {/* Company */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <LogoImage size={36} />
              <div>
                <h3 className="text-lg font-bold">BluePrint</h3>
                <p className="text-xs text-blue-300/60">
                  {t("مكتب الاستشارات الهندسية", "Engineering Consultancy")}
                </p>
              </div>
            </div>
            <p className="text-sm text-blue-200/50 leading-relaxed">
              {t(
                "مكتب هندسي متخصص في رأس الخيمة يقدم خدمات التصميم والترخيص والإشراف الهندسي بأعلى معايير الجودة",
                "A specialized engineering consultancy in Ras Al Khaimah providing design, licensing, and supervision services to the highest quality standards"
              )}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">
              {t("روابط سريعة", "Quick Links")}
            </h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-blue-200/50 hover:text-blue-200 transition-colors"
                  >
                    {t(link.labelAr, link.labelEn)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-sm mb-4">
              {t("خدماتنا", "Our Services")}
            </h4>
            <ul className="space-y-2.5">
              {SERVICE_LINKS.map((s) => (
                <li key={s.labelEn}>
                  <Link
                    href={s.href}
                    className="text-sm text-blue-200/50 hover:text-blue-200 transition-colors"
                  >
                    {t(s.labelAr, s.labelEn)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-4">
              {t("تواصل معنا", "Contact Us")}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-blue-200/50">
                <MapPin className="w-4 h-4 text-[#4A6FA5] shrink-0 mt-0.5" />
                {company.address}
              </li>
              <li className="flex items-center gap-2 text-sm text-blue-200/50">
                <Phone className="w-4 h-4 text-[#4A6FA5] shrink-0" />
                <span dir="ltr">{company.phone}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-blue-200/50">
                <Mail className="w-4 h-4 text-[#4A6FA5] shrink-0" />
                {company.email}
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 text-center text-xs text-blue-200/30">
          &copy; {year} BluePrint Engineering Consultancy.{" "}
          {t("جميع الحقوق محفوظة.", "All rights reserved.")}
        </div>
      </div>

      {/* Floating WhatsApp */}
      <a
        href={`https://wa.me/${company.phone.replace(/[^0-9]/g, '')}?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%D9%83%D9%85`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-[60] w-14 h-14 bg-[#25D366] hover:bg-[#20BD5A] rounded-full flex items-center justify-center shadow-xl shadow-[#25D366]/30 hover:shadow-[#25D366]/50 transition-all duration-300 hover:scale-110"
        aria-label={t("تواصل عبر واتساب", "Chat on WhatsApp")}
      >
        <MessageCircle className="w-7 h-7 text-white" />
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
      </a>
    </footer>
  );
}
