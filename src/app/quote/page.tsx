"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/use-lang";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Calculator,
  Building2,
  HardHat,
  FileText,
  User,
  Phone,
  Mail,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ClipboardCheck,
  Eye,
  KeyRound,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PublicHeader from "@/components/layout/public-header";
import { SkipNavContent } from "@/components/common/accessible-components";
import PublicFooter from "@/components/layout/public-footer";
import { extractErrorMessage } from "@/lib/api/fetch-client";

const SERVICE_TYPES = [
  { value: "design", label: "خدمة تصميم", labelEn: "Design Service", icon: Building2, desc: "تصميم معماري أو إنشائي أو MEP", descEn: "Architectural, structural, or MEP design" },
  { value: "supervision", label: "إشراف تنفيذ", labelEn: "Construction Supervision", icon: Eye, desc: "إشراف هندسي على أعمال التنفيذ", descEn: "Engineering supervision on construction works" },
  { value: "inspection", label: "فحص هندسي", labelEn: "Engineering Inspection", icon: ClipboardCheck, desc: "فحص المباني والتقييمات الإنشائية", descEn: "Building inspection and structural assessments" },
  { value: "licensing", label: "ترخيص", labelEn: "Licensing", icon: FileText, desc: "رخص بلدية ودفاع مدني", descEn: "Municipality and civil defense permits" },
  { value: "turnkey", label: "مشروع متكامل", labelEn: "Turnkey Project", icon: KeyRound, desc: "من التصميم حتى التسليم", descEn: "From design to handover" },
];

const BUILDING_TYPES = [
  { value: "VILLA", label: "فيلا", labelEn: "Villa", icon: Building2 },
  { value: "APARTMENT", label: "عمارة سكنية", labelEn: "Apartment Building", icon: Building2 },
  { value: "COMMERCIAL", label: "تجاري", labelEn: "Commercial", icon: HardHat },
  { value: "INDUSTRIAL", label: "صناعي", labelEn: "Industrial", icon: HardHat },
  { value: "other", label: "أخرى", labelEn: "Other", icon: FileText },
];

const LOCATIONS_AR = [
  "النخيل",
  "الحمرية",
  "المنصورة",
  "المعيرض",
  "الرفاع",
  "القرية",
  "شعم",
  "الع القري",
  "ماريان",
  "الدام",
  "أخرى",
];

const LOCATIONS_EN = [
  "Al Nakheel",
  "Al Hamra",
  "Al Mansourah",
  "Al Maireed",
  "Al Rafaq",
  "Al Quraiyah",
  "Sham",
  "Al Qusaidat",
  "Marian",
  "Al Daqdaqa",
  "Other",
];

const LOCATIONS_MAP: Record<string, string> = {};
LOCATIONS_AR.forEach((ar, i) => {
  LOCATIONS_MAP[ar] = LOCATIONS_EN[i];
});

const AREA_OPTIONS_AR = [
  "أقل من 300 م²",
  "300 - 500 م²",
  "500 - 1,000 م²",
  "1,000 - 2,000 م²",
  "أكثر من 2,000 م²",
];

const AREA_OPTIONS_EN = [
  "Less than 300 m²",
  "300 - 500 m²",
  "500 - 1,000 m²",
  "1,000 - 2,000 m²",
  "More than 2,000 m²",
];

const FLOOR_OPTIONS_AR = [
  "دور واحد (أرضي)",
  "دوران",
  "3 أدوار",
  "4 أدوار",
  "5 أدوار أو أكثر",
];

const FLOOR_OPTIONS_EN = [
  "Single Floor (Ground)",
  "Two Floors",
  "3 Floors",
  "4 Floors",
  "5 Floors or More",
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const TOTAL_STEPS = 5;

// Parallax Background Component
function ParallaxBackground() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  return (
    <div ref={ref} className="fixed inset-0 -z-10">
      <motion.div style={{ y, opacity }} className="absolute inset-0">
        <Image
          src="/quote-bg.png"
          alt="Engineering Blueprint"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-900/95" />
      </motion.div>
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="quote-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#quote-grid)" />
        </svg>
      </div>
      {/* Floating Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 start-20 w-64 h-64 rounded-full bg-[#0F2557]/15 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-40 end-20 w-80 h-80 rounded-full bg-[#1A4A8B]/12 blur-3xl"
      />
    </div>
  );
}

export default function QuotePage() {
  const { lang: language, t: _tHook } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  // Keep document direction in sync
  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [area, setArea] = useState("");
  const [floors, setFloors] = useState("1");
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const canProceed = () => {
    switch (step) {
      case 1: return !!serviceType;
      case 2: return !!buildingType;
      case 3: return !!area && !!location;
      case 4: return !!name && !!phone;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
      setSubmitError("");
    try {
      const res = await fetch("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          serviceType,
          buildingType,
          area,
          floors: parseInt(floors) || 1,
          location,
          message,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(extractErrorMessage(data.error, "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى."));
      }
    } catch (_err) {
      setSubmitError("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStepLabel = () => {
    switch (step) {
      case 1: return t("نوع الخدمة", "Service Type");
      case 2: return t("نوع المبنى", "Building Type");
      case 3: return t("تفاصيل الموقع", "Site Details");
      case 4: return t("بيانات التواصل", "Contact Info");
      case 5: return t("مراجعة وإرسال", "Review & Submit");
      default: return "";
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 1: return ClipboardList;
      case 2: return Building2;
      case 3: return Calculator;
      case 4: return User;
      case 5: return CheckCircle2;
      default: return ClipboardList;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <ParallaxBackground />
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <SkipNavContent />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md w-full text-center bg-white/95 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#0F2557]/30"
            >
              <CheckCircle2 className="w-12 h-12 text-white" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-slate-900 mb-3"
            >
              {t("تم إرسال طلبك بنجاح!", "Your Request Has Been Submitted Successfully!")}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 mb-2"
            >
              {t("سنتواصل معك خلال", "We will contact you within")} <span className="font-semibold text-[#0F2557]">{t("24 ساعة", "24 hours")}</span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-slate-400 mb-8"
            >
              {t("رقم الطلب سيتم إرساله على هاتفك والبريد الإلكتروني", "The request number will be sent to your phone and email")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl h-11">
                  {t("العودة للرئيسية", "Back to Home")}
                </Button>
              </Link>
              <Link href="/calculator">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] text-white rounded-xl h-11 shadow-lg shadow-[#0F2557]/20">
                  <Calculator className="w-4 h-4 me-1.5" />
                  {t("حاسبة التكاليف", "Cost Calculator")}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const areaValues = ["less-300", "300-500", "500-1000", "1000-2000", "2000+"];

  const getAreaLabel = (val: string) => {
    const idx = areaValues.indexOf(val);
    if (idx === -1) return val;
    return language === "ar" ? AREA_OPTIONS_AR[idx] : AREA_OPTIONS_EN[idx];
  };

  const getLocationLabel = (loc: string) => {
    return language === "ar" ? loc : (LOCATIONS_MAP[loc] || loc);
  };

  return (
    <div className="min-h-screen flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      <ParallaxBackground />
      <PublicHeader />

      <main className="flex-1 py-8 sm:py-12">
        <SkipNavContent />
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Progress Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center mb-8"
          >
            <motion.div variants={fadeInUp} custom={0} className="inline-flex items-center gap-2 bg-[#0F2557]/15 backdrop-blur-sm border border-[#0F2557]/25 text-blue-200/90 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <MessageCircle className="w-4 h-4" />
              {t("طلب عرض سعر", "Request a Quote")}
            </motion.div>
            <motion.h1 variants={fadeInUp} custom={1} className="text-2xl sm:text-3xl font-bold text-white">
              {t("احصل على عرض سعر مخصص", "Get a Custom Quote")}
            </motion.h1>
            <motion.p variants={fadeInUp} custom={2} className="text-slate-400 mt-2">
              {t("أجب على بضعة أسئلة وسنقدم لك عرض سعر خلال 24 ساعة", "Answer a few questions and we'll provide a quote within 24 hours")}
            </motion.p>
          </motion.div>

          {/* Step Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">{t("الخطوة", "Step")} {step} {t("من", "of")} {TOTAL_STEPS}</span>
              <span className="text-sm text-blue-200/90 flex items-center gap-1.5">
                {React.createElement(getStepIcon(), { className: "w-4 h-4" })}
                {getStepLabel()}
              </span>
            </div>
            <div className="h-2 bg-slate-800/50 backdrop-blur-sm rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] rounded-full relative"
                initial={{ width: "20%" }}
                animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/30"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            </div>
            {/* Step indicators */}
            <div className="flex justify-between mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    s <= step ? "bg-[#0F2557]" : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* Form Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20"
            >
              {/* Step 1: Service Type */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-white" />
                    </div>
                    {t("ما نوع الخدمة التي تحتاجها؟", "What type of service do you need?")}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    {SERVICE_TYPES.map((s, i) => {
                      const Icon = s.icon;
                      const isSelected = serviceType === s.value;
                      return (
                        <motion.button
                          key={s.value}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          onClick={() => setServiceType(s.value)}
                          className={`p-4 rounded-2xl border-2 text-right transition-all duration-300 cursor-pointer group ${
                            isSelected
                              ? "border-[#0F2557] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] shadow-lg shadow-[#0F2557]/8"
                              : "border-slate-200 hover:border-[#1A4A8B] hover:bg-[#EFF6FF]/40 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                              isSelected 
                                ? "bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] shadow-md shadow-[#0F2557]/20" 
                                : "bg-slate-100 group-hover:bg-[#EFF6FF]"
                            }`}>
                              <Icon className={`w-6 h-6 transition-colors ${isSelected ? "text-white" : "text-slate-500 group-hover:text-[#0F2557]"}`} />
                            </div>
                            <div>
                              <div className={`font-semibold text-sm transition-colors ${isSelected ? "text-[#0A1628]" : "text-slate-900"}`}>
                                {language === "ar" ? s.label : s.labelEn}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">{language === "ar" ? s.desc : s.descEn}</div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Building Type */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    {t("ما نوع المبنى؟", "What type of building?")}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {BUILDING_TYPES.map((b, i) => {
                      const Icon = b.icon;
                      const isSelected = buildingType === b.value;
                      return (
                        <motion.button
                          key={b.value}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.08 }}
                          onClick={() => setBuildingType(b.value)}
                          className={`p-5 rounded-2xl border-2 text-center transition-all duration-300 cursor-pointer group ${
                            isSelected
                              ? "border-[#0F2557] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] shadow-lg shadow-[#0F2557]/8"
                              : "border-slate-200 hover:border-[#1A4A8B] hover:bg-[#EFF6FF]/40 hover:shadow-md"
                          }`}
                        >
                          <Icon className={`w-10 h-10 mx-auto mb-3 transition-all duration-300 ${
                            isSelected 
                              ? "text-[#0F2557] scale-110" 
                              : "text-slate-400 group-hover:text-[#0F2557] group-hover:scale-105"
                          }`} />
                          <div className={`text-sm font-medium transition-colors ${isSelected ? "text-[#0A1628]" : "text-slate-700"}`}>
                            {language === "ar" ? b.label : b.labelEn}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Site Details */}
              {step === 3 && (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                  className="space-y-5"
                >
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                    {t("تفاصيل الموقع", "Site Details")}
                  </h2>

                  <motion.div variants={fadeInUp} custom={0} className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">{t("المساحة (متر مربع)", "Area (square meters)")}</Label>
                    <Select value={area} onValueChange={setArea}>
                      <SelectTrigger className="w-full h-12 border-slate-200 rounded-xl hover:border-[#1A4A8B] transition-colors">
                        <SelectValue placeholder={t("اختر نطاق المساحة", "Select area range")} />
                      </SelectTrigger>
                      <SelectContent>
                        {areaValues.map((val, idx) => (
                          <SelectItem key={val} value={val}>{language === "ar" ? AREA_OPTIONS_AR[idx] : AREA_OPTIONS_EN[idx]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <motion.div variants={fadeInUp} custom={1} className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">{t("عدد الأدوار", "Number of Floors")}</Label>
                    <Select value={floors} onValueChange={setFloors}>
                      <SelectTrigger className="w-full h-12 border-slate-200 rounded-xl hover:border-[#1A4A8B] transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["1", "2", "3", "4", "5+"].map((val, idx) => (
                          <SelectItem key={val} value={val}>{language === "ar" ? FLOOR_OPTIONS_AR[idx] : FLOOR_OPTIONS_EN[idx]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <motion.div variants={fadeInUp} custom={2} className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">{t("المنطقة في رأس الخيمة", "Area in Ras Al Khaimah")}</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger className="w-full h-12 border-slate-200 rounded-xl hover:border-[#1A4A8B] transition-colors">
                        <SelectValue placeholder={t("اختر المنطقة", "Select area")} />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATIONS_AR.map((loc, idx) => (
                          <SelectItem key={loc} value={loc}>{language === "ar" ? loc : LOCATIONS_EN[idx]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 4: Contact Info */}
              {step === 4 && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                  className="space-y-5"
                >
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    {t("بيانات التواصل", "Contact Information")}
                  </h2>

                  <motion.div variants={fadeInUp} custom={0} className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">{t("الاسم الكامل *", "Full Name *")}</Label>
                    <Input
                      placeholder={t("أدخل اسمك الكامل", "Enter your full name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12 border-slate-200 rounded-xl focus:border-[#0F2557] focus:ring-2 focus:ring-[#0F2557]/20 transition-all"
                    />
                  </motion.div>

                  <motion.div variants={fadeInUp} custom={1} className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">{t("رقم الهاتف *", "Phone Number *")}</Label>
                    <div className="relative">
                      <Phone className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="+971 XX XXX XXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        dir="ltr"
                        className="h-12 border-slate-200 rounded-xl focus:border-[#0F2557] focus:ring-2 focus:ring-[#0F2557]/20 text-left ps-12 transition-all"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={fadeInUp} custom={2} className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">{t("البريد الإلكتروني", "Email Address")}</Label>
                    <div className="relative">
                      <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        dir="ltr"
                        className="h-12 border-slate-200 rounded-xl focus:border-[#0F2557] focus:ring-2 focus:ring-[#0F2557]/20 text-left ps-12 transition-all"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={fadeInUp} custom={3} className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">{t("ملاحظات إضافية", "Additional Notes")}</Label>
                    <textarea
                      placeholder={t("أي تفاصيل إضافية عن مشروعك...", "Any additional details about your project...")}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 text-sm focus:border-[#0F2557] focus:ring-2 focus:ring-[#0F2557]/20 resize-none outline-none transition-all"
                    />
                  </motion.div>
                </motion.div>
              )}

              {/* Step 5: Review & Submit */}
              {step === 5 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    {t("مراجعة طلبك", "Review Your Request")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t("تأكد من صحة البيانات قبل الإرسال", "Please verify the information before submitting")}
                  </p>

                  <div className="space-y-3">
                    {[
                      { label: t("نوع الخدمة", "Service Type"), value: language === "ar" ? SERVICE_TYPES.find(s => s.value === serviceType)?.label : SERVICE_TYPES.find(s => s.value === serviceType)?.labelEn },
                      { label: t("نوع المبنى", "Building Type"), value: language === "ar" ? BUILDING_TYPES.find(b => b.value === buildingType)?.label : BUILDING_TYPES.find(b => b.value === buildingType)?.labelEn },
                      { label: t("المساحة", "Area"), value: area ? getAreaLabel(area) : area },
                      { label: t("عدد الأدوار", "Floors"), value: floors === "5+" ? "5+" : `${floors} ${t("أدوار", "Floors")}` },
                      { label: t("المنطقة", "Area"), value: location ? getLocationLabel(location) : location },
                      { label: t("الاسم", "Name"), value: name },
                      { label: t("الهاتف", "Phone"), value: phone },
                      { label: t("البريد الإلكتروني", "Email"), value: email || t("لم يُحدد", "Not specified") },
                    ].map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                      >
                        <span className="text-sm text-slate-500">{item.label}</span>
                        <span className="text-sm font-medium text-slate-900">{item.value}</span>
                      </motion.div>
                    ))}
                  </div>

                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-50 rounded-xl"
                    >
                      <span className="text-xs text-slate-500">{t("ملاحظات:", "Notes:")} </span>
                      <span className="text-sm text-slate-700">{message}</span>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-center"
            >
              <p className="text-sm text-red-600">{submitError}</p>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-between mt-6 gap-4"
          >
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="border-slate-300 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl h-11"
              >
                <ArrowRight className="w-4 h-4 me-1.5" />
                {t("السابق", "Previous")}
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] text-white shadow-lg shadow-[#0F2557]/20 rounded-xl h-11 px-8 disabled:opacity-50"
                >
                  {t("التالي", "Next")}
                  <ArrowLeft className="w-4 h-4 ms-1.5 rotate-180" />
                </Button>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] text-white shadow-lg shadow-[#0F2557]/20 rounded-xl h-11 px-8"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      {t("جاري الإرسال...", "Submitting...")}
                    </span>
                  ) : (
                    <>
                      {t("إرسال الطلب", "Submit Request")}
                      <Sparkles className="w-4 h-4 ms-1.5" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
