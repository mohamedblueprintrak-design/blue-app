"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Calculator, Building2, HardHat, Store, Factory, Layers, BarChart3, DollarSign, FileCheck, Shield, Eye, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react'

import { Button } from "@/components/ui/button";
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

// RAK Market Pricing Data (AED)
interface PricingData {
  designPerSqm: { min: number; max: number };
  municipalityFees: { min: number; max: number };
  civilDefenseFees: { min: number; max: number };
  supervisionPercent: { min: number; max: number };
}

const BUILDING_TYPES = [
  { value: "VILLA", label: "فيلا", labelEn: "Villa", icon: Building2, desc: "سكني خاص" },
  { value: "APARTMENT", label: "عمارة سكنية", labelEn: "Apartment Building", icon: Building2, desc: "متعدد الشقق" },
  { value: "COMMERCIAL", label: "تجاري", labelEn: "Commercial", icon: Store, desc: "مكاتب/محلات" },
  { value: "INDUSTRIAL", label: "صناعي", labelEn: "Industrial", icon: Factory, desc: "مصنع/ورشة" },
];

const AREA_RANGES: Record<string, { label: string; labelEn: string; avgSqm: number }> = {
  "less-300": { label: "أقل من 300 م²", labelEn: "Less than 300 m²", avgSqm: 250 },
  "300-500": { label: "300 - 500 م²", labelEn: "300 - 500 m²", avgSqm: 400 },
  "500-1000": { label: "500 - 1,000 م²", labelEn: "500 - 1,000 m²", avgSqm: 750 },
  "1000+": { label: "أكثر من 1,000 م²", labelEn: "More than 1,000 m²", avgSqm: 1500 },
};

const FLOOR_OPTIONS = [
  { value: "1", label: "دور واحد", labelEn: "Single Floor" },
  { value: "2", label: "دوران", labelEn: "Two Floors" },
  { value: "3", label: "3 أدوار", labelEn: "3 Floors" },
  { value: "4", label: "4 أدوار", labelEn: "4 Floors" },
  { value: "5+", label: "5+ أدوار", labelEn: "5+ Floors" },
];

const FINISH_LEVELS = [
  { value: "standard", label: "عادي", labelEn: "Standard", multiplier: 1.0, desc: "تشطيب قياسي", descEn: "Standard finish" },
  { value: "semi-luxury", label: "فاخر جزئي", labelEn: "Semi-Luxury", multiplier: 1.3, desc: "مواد ممتازة", descEn: "Premium materials" },
  { value: "luxury", label: "فاخر", labelEn: "Luxury", multiplier: 1.6, desc: "تشطيب راقي", descEn: "Elegant finish" },
  { value: "super-luxury", label: "سوبر لوكس", labelEn: "Super Luxury", multiplier: 2.0, desc: "أعلى جودة", descEn: "Highest quality" },
];

// Base pricing per sqm per building type (AED)
const BASE_PRICING: Record<string, PricingData> = {
  VILLA: {
    designPerSqm: { min: 35, max: 55 },
    municipalityFees: { min: 8000, max: 15000 },
    civilDefenseFees: { min: 3000, max: 6000 },
    supervisionPercent: { min: 4, max: 7 },
  },
  APARTMENT: {
    designPerSqm: { min: 25, max: 40 },
    municipalityFees: { min: 15000, max: 35000 },
    civilDefenseFees: { min: 8000, max: 18000 },
    supervisionPercent: { min: 3, max: 6 },
  },
  COMMERCIAL: {
    designPerSqm: { min: 45, max: 75 },
    municipalityFees: { min: 20000, max: 50000 },
    civilDefenseFees: { min: 10000, max: 25000 },
    supervisionPercent: { min: 5, max: 8 },
  },
  INDUSTRIAL: {
    designPerSqm: { min: 20, max: 35 },
    municipalityFees: { min: 15000, max: 40000 },
    civilDefenseFees: { min: 12000, max: 30000 },
    supervisionPercent: { min: 4, max: 7 },
  },
};

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

function formatAED(value: number) {
  return new Intl.NumberFormat("ar-AE", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + " درهم";
}

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
          src="/calculator-bg.png"
          alt="Engineering Calculator"
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
            <pattern id="calc-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#calc-grid)" />
        </svg>
      </div>
      {/* Floating Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-40 end-20 w-72 h-72 rounded-full bg-[#1A4A8B]/15 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-60 start-20 w-96 h-96 rounded-full bg-[#0F2557]/8 blur-3xl"
      />
    </div>
  );
}

export default function CalculatorPage() {
  const [language, setLanguage] = useState<"ar" | "en">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("blueprint-lang") as "ar" | "en" | null;
      if (saved) return saved;
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

  const [buildingType, setBuildingType] = useState("VILLA");
  const [areaRange, setAreaRange] = useState("300-500");
  const [floors, setFloors] = useState("1");
  const [showResult, setShowResult] = useState(false);
  const [finishLevel, setFinishLevel] = useState("standard");

  const floorMultiplier = floors === "5+" ? 1.5 : parseFloat(floors) * 0.7 + 0.3;
  const finishMultiplier = FINISH_LEVELS.find(f => f.value === finishLevel)?.multiplier || 1.0;
  const areaData = AREA_RANGES[areaRange];
  const pricing = BASE_PRICING[buildingType];

  const calculation = useMemo(() => {
    if (!areaData || !pricing) return null;

    const sqm = areaData.avgSqm;

    // Design Cost
    const designMin = Math.round(sqm * pricing.designPerSqm.min * finishMultiplier * Math.min(floorMultiplier, 2.5));
    const designMax = Math.round(sqm * pricing.designPerSqm.max * finishMultiplier * Math.min(floorMultiplier, 2.5));

    // Municipality Fees (scaled with area and floors)
    const muniMin = Math.round(pricing.municipalityFees.min * (1 + (sqm - 250) / 1000) * Math.min(floorMultiplier, 2));
    const muniMax = Math.round(pricing.municipalityFees.max * (1 + (sqm - 250) / 1000) * Math.min(floorMultiplier, 2));

    // Civil Defense Fees
    const civilMin = Math.round(pricing.civilDefenseFees.min * (1 + (sqm - 250) / 2000) * Math.min(floorMultiplier, 2));
    const civilMax = Math.round(pricing.civilDefenseFees.max * (1 + (sqm - 250) / 2000) * Math.min(floorMultiplier, 2));

    // Supervision (percentage of design)
    const supervMin = Math.round(designMin * pricing.supervisionPercent.min / 100);
    const supervMax = Math.round(designMax * pricing.supervisionPercent.max / 100);

    // Total
    const totalMin = designMin + muniMin + civilMin + supervMin;
    const totalMax = designMax + muniMax + civilMax + supervMax;

    return {
      DESIGN: { min: designMin, max: designMax },
      municipality: { min: muniMin, max: muniMax },
      civilDefense: { min: civilMin, max: civilMax },
      supervision: { min: supervMin, max: supervMax },
      total: { min: totalMin, max: totalMax },
    };
  }, [areaData, pricing, finishMultiplier, floorMultiplier]);

  const breakdown = [
    {
      label: t("تكلفة التصميم الهندسي", "Engineering Design Cost"),
      labelEn: "Engineering Design Cost",
      icon: FileCheck,
      color: "from-[#0F2557] to-[#1A4A8B]",
      data: calculation?.DESIGN,
    },
    {
      label: t("رسوم البلدية", "Municipality Fees"),
      labelEn: "Municipality Fees",
      icon: Shield,
      color: "from-blue-500 to-blue-600",
      data: calculation?.municipality,
    },
    {
      label: t("رسوم الدفاع المدني", "Civil Defense Fees"),
      labelEn: "Civil Defense Fees",
      icon: HardHat,
      color: "from-amber-500 to-amber-600",
      data: calculation?.civilDefense,
    },
    {
      label: t("تكلفة الإشراف على التنفيذ", "Construction Supervision Cost"),
      labelEn: "Construction Supervision Cost",
      icon: Eye,
      color: "from-purple-500 to-purple-600",
      data: calculation?.supervision,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <ParallaxBackground />
      <PublicHeader />

      <main className="flex-1 py-8 sm:py-12">
        <SkipNavContent />
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center mb-10"
          >
            <motion.div variants={fadeInUp} custom={0} className="inline-flex items-center gap-2 bg-[#0F2557]/15 backdrop-blur-sm border border-[#0F2557]/25 text-blue-200/90 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Calculator className="w-4 h-4" />
              {t("حاسبة التكاليف", "Cost Calculator")}
            </motion.div>
            <motion.h1 variants={fadeInUp} custom={1} className="text-2xl sm:text-3xl font-bold text-white">
              {t("تقدير تكلفة مشروعك", "Estimate Your Project Cost")}
            </motion.h1>
            <motion.p variants={fadeInUp} custom={2} className="text-slate-400 mt-2 max-w-xl mx-auto">
              {t(
                "أدخل تفاصيل مشروعك واحصل على تقدير تقريبي لتكاليف التصميم والترخيص في رأس الخيمة",
                "Enter your project details and get an approximate estimate for design and licensing costs in Ras Al Khaimah"
              )}
            </motion.p>
          </motion.div>

          {/* Calculator Form */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 space-y-5"
            >
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20 space-y-5">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  {t("تفاصيل المشروع", "Project Details")}
                </h2>

                {/* Building Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{t("نوع المبنى", "Building Type")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUILDING_TYPES.map((b, i) => {
                      const Icon = b.icon;
                      const isSelected = buildingType === b.value;
                      return (
                        <motion.button
                          key={b.value}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => { setBuildingType(b.value); setShowResult(false); }}
                          className={`p-3 rounded-2xl border-2 text-center transition-all duration-300 cursor-pointer group ${
                            isSelected
                              ? "border-[#0F2557] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] shadow-lg shadow-[#0F2557]/8"
                              : "border-slate-200 hover:border-[#1A4A8B] hover:bg-[#EFF6FF]/40 hover:shadow-md"
                          }`}
                        >
                          <Icon className={`w-8 h-8 mx-auto mb-2 transition-all duration-300 ${
                            isSelected ? "text-[#0F2557] scale-110" : "text-slate-400 group-hover:text-[#0F2557]"
                          }`} />
                          <div className={`text-xs font-medium transition-colors ${isSelected ? "text-[#0A1628]" : "text-slate-700"}`}>
                            {language === "ar" ? b.label : b.labelEn}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Area Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{t("نطاق المساحة", "Area Range")}</label>
                  <Select value={areaRange} onValueChange={(v) => { setAreaRange(v); setShowResult(false); }}>
                    <SelectTrigger className="w-full h-12 border-slate-200 rounded-xl hover:border-[#1A4A8B] transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AREA_RANGES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{language === "ar" ? val.label : val.labelEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Floors */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{t("عدد الأدوار", "Number of Floors")}</label>
                  <Select value={floors} onValueChange={(v) => { setFloors(v); setShowResult(false); }}>
                    <SelectTrigger className="w-full h-12 border-slate-200 rounded-xl hover:border-[#1A4A8B] transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FLOOR_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{language === "ar" ? f.label : f.labelEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Finish Level */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{t("مستوى التشطيب", "Finish Level")}</label>
                  <Select value={finishLevel} onValueChange={(v) => { setFinishLevel(v); setShowResult(false); }}>
                    <SelectTrigger className="w-full h-12 border-slate-200 rounded-xl hover:border-[#1A4A8B] transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINISH_LEVELS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <span>{language === "ar" ? f.label : f.labelEn}</span>
                          <span className="text-slate-400 text-xs me-2">({language === "ar" ? f.desc : f.descEn})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => setShowResult(true)}
                    className="w-full h-12 bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] hover:from-[#0A1628] hover:to-[#0F2557] text-white shadow-lg shadow-[#0F2557]/20 rounded-xl text-base"
                  >
                    <TrendingUp className="w-5 h-5 me-2" />
                    {t("احسب التكلفة", "Calculate Cost")}
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Results */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {showResult && calculation ? (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="space-y-4"
                  >
                    {/* Total Card */}
                    <motion.div
                      variants={fadeInUp}
                      custom={0}
                      className="bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] rounded-3xl p-8 text-white shadow-2xl shadow-[#0F2557]/30 relative overflow-hidden"
                    >
                      {/* Animated background pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px)`,
                          backgroundSize: "30px 30px"
                        }} />
                      </div>
                      
                      <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-blue-200/90 text-sm">{t("التكلفة التقديرية الإجمالية", "Total Estimated Cost")}</span>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                          >
                            <DollarSign className="w-5 h-5 text-white" />
                          </motion.div>
                        </div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-3xl sm:text-4xl font-bold mb-2"
                        >
                          {formatAED(calculation.total.min)} - {formatAED(calculation.total.max)}
                        </motion.div>
                        <p className="text-blue-200 text-sm">
                          {t("للمساحة التقريبية", "For approximate area")} {language === "ar" ? areaData.label : areaData.labelEn} ({areaData.avgSqm} م²)
                        </p>
                      </div>
                    </motion.div>

                    {/* Breakdown */}
                    {breakdown.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={language === "ar" ? item.label : item.labelEn}
                          variants={fadeInUp}
                          custom={i + 1}
                          whileHover={{ scale: 1.02, x: 5 }}
                          className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/20 flex items-center gap-4 cursor-pointer transition-all duration-300 hover:shadow-xl"
                        >
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-md`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900">{item.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {item.data ? `${formatAED(item.data.min)} - ${formatAED(item.data.max)}` : "-"}
                            </div>
                          </div>
                          <div className="text-lg font-bold text-slate-900">
                            {item.data ? formatAED(Math.round((item.data.min + item.data.max) / 2)) : "-"}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Disclaimer */}
                    <motion.div
                      variants={fadeInUp}
                      custom={5}
                      className="flex items-start gap-3 p-5 bg-amber-50/90 backdrop-blur-sm border border-amber-200/50 rounded-2xl"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-amber-800">{t("تنبيه مهم", "Important Notice")}</div>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          {t(
                            "هذه الأرقام تقديرية فقط بناءً على متوسط أسعار السوق في رأس الخيمة. التكلفة الفعلية تعتمد على تفاصيل المشروع ومتطلبات البلدية والدفاع المدني. للحصول على عرض سعر دقيق، يرجى",
                            "These figures are estimates only based on average market prices in Ras Al Khaimah. Actual costs depend on project details and municipality/civil defense requirements. For an accurate quote, please"
                          )}{" "}
                          <Link href="/quote" className="underline font-medium hover:text-amber-900">{t("طلب عرض سعر", "Request a Quote")}</Link>.
                        </p>
                      </div>
                    </motion.div>

                    {/* CTA */}
                    <motion.div
                      variants={fadeInUp}
                      custom={6}
                      className="flex flex-col sm:flex-row gap-3"
                    >
                      <Link href="/quote" className="flex-1">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button className="w-full bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] text-white shadow-lg shadow-[#0F2557]/20 h-12 rounded-xl">
                            <Sparkles className="w-4 h-4 me-2" />
                            {t("طلب عرض سعر مفصل", "Request a Detailed Quote")}
                          </Button>
                        </motion.div>
                      </Link>
                      <Link href="/" className="flex-1">
                        <Button variant="outline" className="w-full border-slate-300 text-slate-300 hover:bg-slate-800 hover:text-white h-12 rounded-xl">
                          {t("العودة للرئيسية", "Back to Home")}
                        </Button>
                      </Link>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/95 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/20 text-center"
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#0F2557]/20"
                    >
                      <BarChart3 className="w-10 h-10 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      {t("جاهز لحساب التكلفة؟", "Ready to Calculate Cost?")}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      {t(
                        'أدخل تفاصيل مشروعك ثم اضغط "احسب التكلفة" للحصول على تقدير فوري',
                        'Enter your project details and click "Calculate Cost" to get an instant estimate'
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
