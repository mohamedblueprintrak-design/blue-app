"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Target,
  Eye,
  Award,
  Users,
  Clock,
  CheckCircle2,
  Shield,
  Briefcase,
  GraduationCap,
  MapPin,
} from "lucide-react";
import PublicHeader from "@/components/layout/public-header";
import { SkipNavContent } from "@/components/common/accessible-components";
import PublicFooter from "@/components/layout/public-footer";

const TEAM_MEMBERS = [
  { name: "م. جراح الطير", nameEn: "Eng. Jurrah Al Tayr", title: "المدير العام ومؤسس المكتب", titleEn: "General Manager & Founder", specialty: "هندسة مدنية - إدارة مشاريع", specialtyEn: "Civil Engineering - Project Management" },
  { name: "م. دينا الجاعلي", nameEn: "Eng. Dina Al gaaly", title: "مديرة قسم التصميم المعماري", titleEn: "Architectural Design Manager", specialty: "تصميم معماري", specialtyEn: "Architectural Design" },
  { name: "م. شريف صبري", nameEn: "Eng. Sherif Sabry", title: "مدير قسم التصميم الإنشائي", titleEn: "Structural Design Manager", specialty: "هندسة إنشائية", specialtyEn: "Structural Engineering" },
];

const LICENSES = [
  { title: "رخصة مكتب استشارات هندسية", titleEn: "Engineering Consultancy License", authority: "بلدية رأس الخيمة", authorityEn: "Ras Al Khaimah Municipality", icon: Building2 },
  { title: "عضوية جمعية المهندسين الإماراتية", titleEn: "Emirates Society of Engineers Membership", authority: "جمعية المهندسين - الإمارات", authorityEn: "Emirates Society of Engineers", icon: GraduationCap },
  { title: "اعتماد مزاولة المهنة", titleEn: "Professional Practice License", authority: "وزارة التغيير المناخي والبيئة", authorityEn: "Ministry of Climate Change & Environment", icon: Shield },
  { title: "شهادة الأيزو ISO 9001:2015", titleEn: "ISO 9001:2015 Certification", authority: "إدارة الجودة", authorityEn: "Quality Management", icon: Award },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function AboutPage() {
  const [language, setLanguage] = useState<"ar" | "en">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("blueprint-lang");
      if (saved === "ar" || saved === "en") return saved;
    }
    return "ar";
  });

  // React to language changes from header toggle
  useEffect(() => {
    const handleLangChange = () => {
      const current = localStorage.getItem("blueprint-lang") as "ar" | "en" | null;
      if (current) setLanguage(current);
    };
    window.addEventListener("blueprint-lang-change", handleLangChange);
    window.addEventListener("storage", handleLangChange);
    return () => {
      window.removeEventListener("blueprint-lang-change", handleLangChange);
      window.removeEventListener("storage", handleLangChange);
    };
  }, []);

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      <main className="flex-1">
        <SkipNavContent />
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#0A1628] py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="about-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#about-grid)" />
            </svg>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial="hidden" animate="visible">
              <motion.div variants={fadeInUp} custom={0}>
                <span className="inline-flex items-center gap-2 bg-[#0F2557]/8 border border-[#0F2557]/25 rounded-full px-4 py-1.5 text-blue-200/90 text-sm font-medium mb-4">
                  <Briefcase className="w-4 h-4" />
                  {t("قصتنا", "Our Story")}
                </span>
              </motion.div>
              <motion.h1 variants={fadeInUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                {t("من نحن", "About Us")}
              </motion.h1>
              <motion.p variants={fadeInUp} custom={2} className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                {t("مكتب استشارات هندسية متخصص في تقديم الحلول الهندسية المتميزة في رأس الخيمة", "An engineering consultancy specializing in delivering outstanding engineering solutions in Ras Al Khaimah")}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.h2 variants={fadeInUp} custom={0} className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
                {t("قصة BluePrint", "The BluePrint Story")}
              </motion.h2>
              <motion.div variants={fadeInUp} custom={1} className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  {t(
                    "تأسس مكتب BluePrint للاستشارات الهندسية في رأس الخيمة عام 2025 برؤية واضحة: تقديم خدمات هندسية عالية الجودة تجمع بين الإبداع والدقة والموثوقية.",
                    "BluePrint Engineering Consultancy was established in Ras Al Khaimah in 2025 with a clear vision: delivering high-quality engineering services that combine creativity, precision, and reliability."
                  )}
                </p>
                <p>
                  {t(
                    "نسعى لأن نكون من أبرز مكاتب الاستشارات الهندسية في إمارة رأس الخيمة، ونعمل على تقديم أفضل الحلول الهندسية لمشاريع متنوعة تشمل الفلل السكنية والمجمعات التجارية والمنشآت الصناعية.",
                    "We strive to be one of the most prominent engineering consultancy firms in Ras Al Khaimah, working to provide the best engineering solutions for diverse projects including residential villas, commercial complexes, and industrial facilities."
                  )}
                </p>
                <p>
                  {t(
                    "نحن نؤمن بأن كل مشروع هو فرصة لترك بصمة إيجابية في نسيج العمران في رأس الخيمة. لذلك نحرص على تقديم خدمات تتجاوز توقعات عملائنا، مع الالتزام بأعلى معايير الجودة والسلامة والاستدامة.",
                    "We believe that every project is an opportunity to leave a positive mark on the fabric of Ras Al Khaimah's urban landscape. Therefore, we are committed to delivering services that exceed our clients' expectations while adhering to the highest standards of quality, safety, and sustainability."
                  )}
                </p>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeInUp} custom={2} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
                {[
                  { value: "2025", labelAr: "سنة التأسيس", labelEn: "Est. Year", icon: Clock },
                  { value: "6", labelAr: "تخصصات هندسية", labelEn: "Engineering Disciplines", icon: Building2 },
                  { value: "RAK", labelAr: "رأس الخيمة", labelEn: "Ras Al Khaimah", icon: MapPin },
                  { value: "ISO", labelAr: "ISO 9001:2015", labelEn: "ISO 9001:2015", icon: GraduationCap },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.labelEn} className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <Icon className="w-6 h-6 text-[#0F2557] mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                      <div className="text-xs text-slate-500 mt-1">{t(stat.labelAr, stat.labelEn)}</div>
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} custom={0} className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{t("رسالتنا", "Our Mission")}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {t(
                    "تقديم خدمات استشارية هندسية متميزة تلبي احتياجات عملائنا وتتجاوز توقعاتهم، مع الالتزام بأعلى معايير الجودة والابتكار في كل مشروع نعمل عليه.",
                    "Delivering distinguished engineering consultancy services that meet and exceed our clients' expectations, committed to the highest standards of quality and innovation in every project we undertake."
                  )}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{t("رؤيتنا", "Our Vision")}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {t(
                    "أن نكون المكتب الاستشاري الهندسي الأول في رأس الخيمة والإمارات، ونلعب دوراً محورياً في تطوير البنية التحتية والعمران بطريقة مستدامة ومبتكرة.",
                    "To be the leading engineering consultancy firm in Ras Al Khaimah and the UAE, playing a pivotal role in developing infrastructure and urban landscape in a sustainable and innovative manner."
                  )}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.div variants={fadeInUp} custom={0} className="text-center mb-12">
                <span className="inline-flex items-center gap-2 bg-[#EFF6FF] text-[#0F2557] rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                  <Users className="w-4 h-4" />
                  {t("فريقنا", "Our Team")}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {t("فريق من الخبراء والمتخصصين", "A Team of Experts & Specialists")}
                </h2>
                <p className="mt-2 text-slate-500">
                  {t("مهندسون معتمدون بخبرات متنوعة ومتميزة", "Certified engineers with diverse and distinguished expertise")}
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} custom={1} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {TEAM_MEMBERS.map((member, i) => (
                  <motion.div
                    key={member.nameEn}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Photo placeholder */}
                    <div className="h-32 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1A4A8B] to-[#2563EB] flex items-center justify-center text-white text-2xl font-bold">
                        {member.name.charAt(member.name.indexOf(" ") + 1)}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-900">{t(member.name, member.nameEn)}</h3>
                      <p className="text-sm text-[#0F2557] font-medium mt-1">{t(member.title, member.titleEn)}</p>
                      <p className="text-xs text-slate-500 mt-2">{t(member.specialty, member.specialtyEn)}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Licenses */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.div variants={fadeInUp} custom={0} className="text-center mb-10">
                <span className="inline-flex items-center gap-2 bg-[#EFF6FF] text-[#0F2557] rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                  <Award className="w-4 h-4" />
                  {t("التراخيص والشهادات", "Licenses & Certificates")}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {t("اعتمادات وشهاداتنا", "Our Accreditations & Certificates")}
                </h2>
              </motion.div>

              <motion.div variants={fadeInUp} custom={1} className="grid sm:grid-cols-2 gap-4">
                {LICENSES.map((license) => {
                  const Icon = license.icon;
                  return (
                    <div key={license.titleEn} className="flex items-start gap-4 p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm">
                      <div className="w-10 h-10 rounded-lg bg-[#EFF6FF]/60 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[#0F2557]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{t(license.title, license.titleEn)}</h4>
                        <p className="text-xs text-slate-500 mt-1">{t(license.authority, license.authorityEn)}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-[#0F2557] shrink-0 mt-0.5" />
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
