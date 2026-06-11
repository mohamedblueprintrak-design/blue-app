"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Building2, HardHat, Zap, FileCheck, Shield, Eye, ClipboardCheck, KeyRound, ChevronDown, ChevronUp, CheckCircle2, ListOrdered, Phone, Sparkles, Pause, Play } from 'lucide-react'

import { Button } from "@/components/ui/button";
import PublicHeader from "@/components/layout/public-header";
import PublicFooter from "@/components/layout/public-footer";
import { SkipNavContent } from "@/components/common/accessible-components";

const SERVICES_DETAIL = [
  {
    icon: Building2,
    title: "التصميم المعماري",
    titleEn: "Architectural Design",
    desc: "نقدم تصاميم معمارية إبداعية ومبتكرة تراعي احتياجات العملاء ومتطلبات بلدية رأس الخيمة. تشمل خدماتنا التصميم المفاهيمي والتصميم التفصيلي وثلاثي الأبعاد.",
    descEn: "We deliver creative and innovative architectural designs that meet client needs and RAK Municipality requirements. Our services include conceptual design, detailed design, and 3D modeling.",
    features: [
      "المخططات المعمارية التفصيلية",
      "تصميم واجهات المباني",
      "نماذج ثلاثية الأبعاد",
      "مخططات الأثاث والتجهيزات",
      "تصاميم المناظر الطبيعية",
      "مخططات الإسقاط والقطاعات",
    ],
    featuresEn: [
      "Detailed architectural plans",
      "Building facade design",
      "3D models",
      "Furniture and equipment layouts",
      "Landscape designs",
      "Projection and section plans",
    ],
  },
  {
    icon: HardHat,
    title: "التصميم الإنشائي",
    titleEn: "Structural Design",
    desc: "تصاميم إنشائية دقيقة وموثوقة تضمن سلامة وأمان المباني. نستخدم أحدث البرامج والتقنيات لإعداد الحسابات الإنشائية ومخططات التسليح.",
    descEn: "Precise and reliable structural designs ensuring building safety and security. We use the latest software and technologies for structural calculations and reinforcement detailing.",
    features: [
      "الحسابات الإنشائية",
      "مخططات التسليح التفصيلية",
      "تصميم الأساسات",
      "تصميم الهيكل الخرساني والفولاذي",
      "تقارير الجيوتقنية",
      "دراسات الحمل الزلزالي",
    ],
    featuresEn: [
      "Structural calculations",
      "Detailed reinforcement drawings",
      "Foundation design",
      "Concrete and steel structure design",
      "Geotechnical reports",
      "Seismic load studies",
    ],
  },
  {
    icon: Zap,
    title: "التصميم الكهربائي والميكانيكي",
    titleEn: "Electrical & Mechanical Design",
    desc: "تصاميم MEP متكاملة تشمل أنظمة الكهرباء والتكييف والسباكة والغاز وأنظمة مكافحة الحريق، وفقاً لمعايير الدفاع المدني وبلدية رأس الخيمة.",
    descEn: "Comprehensive MEP designs including electrical, HVAC, plumbing, gas, and fire suppression systems, in accordance with Civil Defense and RAK Municipality standards.",
    features: [
      "تصميم الأنظمة الكهربائية",
      "تصميم أنظمة التكييف (HVAC)",
      "تصميم أنظمة السباكة والصرف الصحي",
      "تصميم أنظمة إطفاء الحريق",
      "تصميم أنظمة المراقبة والأمن",
      "تصميم أنظمة الاتصالات",
    ],
    featuresEn: [
      "Electrical systems design",
      "HVAC systems design",
      "Plumbing and drainage design",
      "Fire suppression systems design",
      "Surveillance and security design",
      "Communications systems design",
    ],
  },
  {
    icon: FileCheck,
    title: "رخص البلدية",
    titleEn: "Municipality Licenses",
    desc: "خدمة شاملة لاستخراج رخص البناء من بلدية رأس الخيمة. نتولى جميع إجراءات التقديم والمتابعة حتى الحصول على الموافقة.",
    descEn: "Comprehensive service for obtaining building permits from RAK Municipality. We handle all submission and follow-up procedures until approval is granted.",
    features: [
      "مراجعة المخططات والتأكد من توافقها",
      "إعداد مستندات التقديم",
      "متابعة إجراءات الموافقة",
      "معالجة ملاحظات البلدية",
      "الحصول على رخصة البناء",
      "تجديد الرخص المعمارية",
    ],
    featuresEn: [
      "Plan review and compliance check",
      "Submission document preparation",
      "Approval procedure follow-up",
      "Municipality comments resolution",
      "Building permit acquisition",
      "Architectural license renewal",
    ],
  },
  {
    icon: Shield,
    title: "رخص الدفاع المدني",
    titleEn: "Civil Defense Licenses",
    desc: "نحصل على موافقات الدفاع المدني وشهادات السلامة لجميع أنواع المشاريع، مع ضمان التوافق الكامل مع متطلبات السلامة.",
    descEn: "We obtain Civil Defense approvals and safety certificates for all project types, ensuring full compliance with safety requirements.",
    features: [
      "تصميم أنظمة السلامة",
      "إعداد ملفات الدفاع المدني",
      "متابعة إجراءات الموافقة",
      "فحص الأنظمة وتجربتها",
      "الحصول على شهادة الإنجاز",
      "تحديث شهادات السلامة",
    ],
    featuresEn: [
      "Safety systems design",
      "Civil Defense file preparation",
      "Approval procedure follow-up",
      "System inspection and testing",
      "Completion certificate acquisition",
      "Safety certificate updates",
    ],
  },
  {
    icon: Eye,
    title: "إشراف التنفيذ",
    titleEn: "Construction Supervision",
    desc: "إشراف هندسي دقيق على جميع مراحل التنفيذ لضمان تنفيذ المخططات بالشكل المطلوب وتحقيق أعلى معايير الجودة والسلامة.",
    descEn: "Precise engineering supervision throughout all construction phases to ensure plans are executed as required, achieving the highest quality and safety standards.",
    features: [
      "إعداد خطة الإشراف",
      "مراجعة أعمال المقاولين",
      "ضبط جودة المواد",
      "إعداد تقارير دورية",
      "مراجعة المستخلصات",
      "تسليم المشروع",
    ],
    featuresEn: [
      "Supervision plan preparation",
      "Contractor work review",
      "Material quality control",
      "Periodic report preparation",
      "Payment certificates review",
      "Project handover",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "الفحص الهندسي",
    titleEn: "Engineering Inspection",
    desc: "فحوصات هندسية شاملة للمباني القائمة والمشاريع تحت التنفيذ، مع تقديم تقارير مفصلة وتوصيات فنية دقيقة.",
    descEn: "Comprehensive engineering inspections for existing buildings and projects under construction, with detailed reports and precise technical recommendations.",
    features: [
      "الفحص البصري والميداني",
      "اختبارات الخرسانة",
      "فحص التسليح",
      "فحص الأنظمة الكهربائية والميكانيكية",
      "تقييم سلامة المبنى",
      "تقارير فنية مفصلة",
    ],
    featuresEn: [
      "Visual and field inspection",
      "Concrete testing",
      "Rebar inspection",
      "Electrical and mechanical systems inspection",
      "Building safety assessment",
      "Detailed technical reports",
    ],
  },
  {
    icon: KeyRound,
    title: "مشاريع المفاتيح",
    titleEn: "Turnkey Projects",
    desc: "مشاريع متكاملة من التصميم حتى التسليم بالمفتاح. نتولى إدارة المشروع بالكامل من التخطيط والتصميم حتى البناء والتشطيب والتسليم.",
    descEn: "Integrated projects from design to turnkey delivery. We manage the entire project from planning and design through construction, finishing, and handover.",
    features: [
      "دراسة الجدوى",
      "التصميم الكامل",
      "إدارة المقاولات",
      "إشراف التنفيذ",
      "التشطيب والتجهيز",
      "التسليم بالمفتاح",
    ],
    featuresEn: [
      "Feasibility study",
      "Complete design",
      "Contract management",
      "Construction supervision",
      "Finishing and outfitting",
      "Turnkey delivery",
    ],
  },
];

const PROCESS_STEPS = [
  { step: 1, title: "الاستشارة الأولية", titleEn: "Initial Consultation", desc: "نستمع لاحتياجاتك ونفهم متطلبات مشروعك في اجتماع مجاني", descEn: "We listen to your needs and understand your project requirements in a free meeting", icon: Building2 },
  { step: 2, title: "دراسة الموقع", titleEn: "Site Study", desc: "نقوم بزيارة ميدانية للموقع وتقييم المتطلبات والتحديات", descEn: "We conduct a field visit to the site and assess requirements and challenges", icon: Eye },
  { step: 3, title: "التصميم والتخطيط", titleEn: "Design & Planning", desc: "نعمل على إعداد التصاميم والمخططات بالتنسيق معك", descEn: "We prepare designs and plans in coordination with you", icon: HardHat },
  { step: 4, title: "الموافقات الحكومية", titleEn: "Government Approvals", desc: "نتولى جميع إجراءات الترخيص والموافقات من الجهات المعنية", descEn: "We handle all licensing and approval procedures from relevant authorities", icon: FileCheck },
  { step: 5, title: "التنفيذ والمتابعة", titleEn: "Execution & Follow-up", desc: "نشرف على التنفيذ مع تقارير دورية وتحديثات مستمرة", descEn: "We supervise execution with periodic reports and continuous updates", icon: ClipboardCheck },
  { step: 6, title: "التسليم", titleEn: "Handover", desc: "نسلم المشروع وفقاً لأعلى معايير الجودة والسلامة", descEn: "We deliver the project according to the highest quality and safety standards", icon: CheckCircle2 },
];

const FAQS = [
  {
    q: "كم تستغرق عملية التصميم المعماري؟",
    qEn: "How long does the architectural design process take?",
    a: "تختلف المدة حسب حجم المشروع ونوعه. عادةً ما تستغرق فيلا سكنية من 3 إلى 6 أسابيع، بينما قد تحتاج المشاريع التجارية الكبيرة إلى 2-3 أشهر.",
    aEn: "The duration varies depending on the project size and type. A residential villa typically takes 3 to 6 weeks, while large commercial projects may need 2-3 months.",
  },
  {
    q: "ما هي الرسوم المطلوبة لاستخراج رخصة البناء؟",
    qEn: "What are the fees for obtaining a building permit?",
    a: "تختلف الرسوم حسب نوع المشروع ومساحته. نقدم استشارة مجانية لتحديد التكاليف المتوقعة. يمكنك استخدام حاسبة التكاليف على موقعنا للحصول على تقدير.",
    aEn: "Fees vary depending on the project type and area. We offer a free consultation to determine expected costs. You can use the cost calculator on our website for an estimate.",
  },
  {
    q: "هل تقدمون خدمات لمناطق خارج رأس الخيمة؟",
    qEn: "Do you offer services outside Ras Al Khaimah?",
    a: "نعم، نقدم خدماتنا في جميع إمارات الدولة، لكن تركيزنا الأساسي في رأس الخيمة حيث نمتلك خبرة واسعة بالمتطلبات المحلية.",
    aEn: "Yes, we offer our services across all emirates, but our primary focus is in Ras Al Khaimah where we have extensive knowledge of local requirements.",
  },
  {
    q: "كيف يمكنني طلب عرض سعر؟",
    qEn: "How can I request a price quote?",
    a: "يمكنك ملء نموذج طلب عرض السعر على موقعنا أو التواصل معنا عبر الهاتف أو الواتساب. سنقدم لك عرض سعر مفصل خلال 24 ساعة.",
    aEn: "You can fill out the quote request form on our website or contact us via phone or WhatsApp. We will provide you with a detailed quote within 24 hours.",
  },
  {
    q: "ما أنواع المشاريع التي تتعاملون معها؟",
    qEn: "What types of projects do you handle?",
    a: "نتعامل مع جميع أنواع المشاريع: الفلل السكنية، العمارات، المباني التجارية، المنشآت الصناعية، المباني الحكومية، والمشاريع الخاصة.",
    aEn: "We handle all types of projects: residential villas, apartment buildings, commercial buildings, industrial facilities, government buildings, and special projects.",
  },
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
          src="/services-bg.png"
          alt="Engineering Team"
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
            <pattern id="services-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#services-grid)" />
        </svg>
      </div>
      {/* Floating Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-32 end-32 w-64 h-64 rounded-full bg-[#0F2557]/15 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute bottom-40 start-32 w-80 h-80 rounded-full bg-[#1A4A8B]/12 blur-3xl"
      />
    </div>
  );
}

// Marquee Component
function ServicesMarquee({ language }: { language: "ar" | "en" }) {
  const [isMarqueePaused, setIsMarqueePaused] = useState(false);

  const servicesAr = [
    "تصميم معماري",
    "تصميم إنشائي",
    "تصميم كهروميكانيكي",
    "رخص البلدية",
    "رخص الدفاع المدني",
    "إشراف التنفيذ",
    "فحص هندسي",
    "مشاريع المفاتيح",
  ];
  const servicesEn = [
    "Architectural Design",
    "Structural Design",
    "MEP Design",
    "Municipality Licenses",
    "Civil Defense Licenses",
    "Construction Supervision",
    "Engineering Inspection",
    "Turnkey Projects",
  ];
  const services = language === "ar" ? servicesAr : servicesEn;

  return (
    <div
      className="relative py-6 bg-gradient-to-r from-[#0F2557] via-[#1A4A8B] to-[#0F2557] overflow-hidden"
      onMouseEnter={() => setIsMarqueePaused(true)}
      onMouseLeave={() => setIsMarqueePaused(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F2557]/50 via-transparent to-[#1A4A8B]/50 animate-pulse" />

      <button
        onClick={() => setIsMarqueePaused(prev => !prev)}
        aria-label={isMarqueePaused ? "Play scrolling" : "Pause scrolling"}
        className="absolute top-2 end-2 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
      >
        {isMarqueePaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </button>

      <div
        className="flex whitespace-nowrap"
        style={{
          animation: "marquee-scroll 20s linear infinite",
          animationPlayState: isMarqueePaused ? "paused" : "running",
        }}
      >
        {[...services, ...services, ...services, ...services].map((service, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 text-white/90 font-medium"
          >
            <span>{service}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export default function ServicesPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  // Read saved language after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("blueprint-lang");
    if (saved === "ar" || saved === "en") setLanguage(saved);
  }, []);

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

  const [company, setCompany] = useState({
    phone: "+971 50 161 1234",
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/stats', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.company) {
          setCompany({ phone: data.company.phone || "+971 50 161 1234" });
        }
      })
      .catch(err => { if (err.name !== 'AbortError') { /* ignore non-abort errors */ } });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <ParallaxBackground />
      <PublicHeader />

      <main className="flex-1">
        <SkipNavContent />
        {/* Hero */}
        <section className="relative py-20 sm:py-28 overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} custom={0}>
                <span className="inline-flex items-center gap-2 bg-[#0F2557]/15 backdrop-blur-sm border border-[#0F2557]/25 rounded-full px-4 py-1.5 text-blue-200/90 text-sm font-medium mb-4">
                  <Building2 className="w-4 h-4" />
                  {t("خدماتنا", "Our Services")}
                </span>
              </motion.div>
              <motion.h1
                variants={fadeInUp}
                custom={1}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white"
              >
                {t("خدمات هندسية شاملة", "Comprehensive Engineering Services")}
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                custom={2}
                className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
              >
                {t("نغطي جميع مراحل المشروع من التصميم حتى التسليم بخبرة احترافية", "We cover all project phases from design to delivery with professional expertise")}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Marquee */}
        <ServicesMarquee language={language} />

        {/* Services Detail */}
        <section className="py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              {SERVICES_DETAIL.map((service, _i) => {
                const Icon = service.icon;
                return (
                  <motion.div
                    key={service.title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeInUp}
                    custom={0}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white/95 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-[#0F2557]/8"
                  >
                    <div className="p-6 sm:p-8">
                      <div className="flex items-start gap-5">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center shrink-0 shadow-lg shadow-[#0F2557]/20 transition-transform duration-300"
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#0A1628] transition-colors">
                            {t(service.title, service.titleEn)}
                          </h3>
                          <p className="text-sm text-slate-500 leading-relaxed mb-4">{t(service.desc, service.descEn)}</p>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {service.features.map((feature, fi) => (
                              <motion.div
                                key={feature}
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: fi * 0.05 }}
                                viewport={{ once: true }}
                                className="flex items-center gap-2 text-sm text-slate-600"
                              >
                                <CheckCircle2 className="w-4 h-4 text-[#0F2557] shrink-0" />
                                {t(feature, service.featuresEn[fi])}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How We Work */}
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={fadeInUp} custom={0} className="text-center mb-12">
                <span className="inline-flex items-center gap-2 bg-[#0F2557]/15 backdrop-blur-sm border border-[#0F2557]/25 text-blue-200/90 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                  <ListOrdered className="w-4 h-4" />
                  {t("كيف نعمل", "How We Work")}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {t("منهجية عملنا", "Our Methodology")}
                </h2>
                <p className="mt-2 text-slate-400">
                  {t("نتبع منهجية واضحة ومجربة لضمان نجاح مشاريع عملائنا", "We follow a clear and proven methodology to ensure our clients' project success")}
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} custom={1} className="relative">
                {/* Vertical line */}
                <div className="absolute start-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0F2557] via-[#1A4A8B] to-[#0F2557] hidden sm:block" />

                <div className="space-y-6">
                  {PROCESS_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={step.step}
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        className="flex items-start gap-5 sm:gap-6 relative group"
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F2557] to-[#1A4A8B] flex items-center justify-center shrink-0 text-white font-bold text-lg z-10 shadow-lg shadow-[#0F2557]/20"
                        >
                          <Icon className="w-7 h-7" />
                        </motion.div>
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 shadow-lg flex-1 group-hover:shadow-xl group-hover:shadow-[#0F2557]/5 transition-all duration-300">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#0F2557] text-xs font-bold flex items-center justify-center">
                              {step.step}
                            </span>
                            <h4 className="text-base font-bold text-slate-900">{t(step.title, step.titleEn)}</h4>
                          </div>
                          <p className="text-sm text-slate-500">{t(step.desc, step.descEn)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={fadeInUp} custom={0} className="text-center mb-10">
                <span className="inline-flex items-center gap-2 bg-[#0F2557]/15 backdrop-blur-sm border border-[#0F2557]/25 text-blue-200/90 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                  {t("الأسئلة الشائعة", "FAQ")}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {t("أسئلة متكررة", "Frequently Asked Questions")}
                </h2>
              </motion.div>

              <motion.div variants={fadeInUp} custom={1} className="space-y-3">
                {FAQS.map((faq, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/95 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden shadow-lg"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="w-full flex items-center justify-between p-5 text-right cursor-pointer hover:bg-[#EFF6FF]/40 transition-colors"
                      >
                        <span className="text-sm font-semibold text-slate-900">{t(faq.q, faq.qEn)}</span>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 me-3"
                        >
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-[#0F2557]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#0F2557]" />
                          )}
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                              {t(faq.a, faq.aEn)}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F2557] to-[#1A4A8B]" />
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="cta-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
                  <circle cx="15" cy="15" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-pattern)" />
            </svg>
          </div>
          
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.h2
                variants={fadeInUp}
                custom={0}
                className="text-2xl sm:text-3xl font-bold text-white mb-4"
              >
                {t("جاهز لبدء مشروعك؟", "Ready to Start Your Project?")}
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                custom={1}
                className="text-blue-100 mb-8 max-w-xl mx-auto"
              >
                {t("تواصل معنا الآن واحصل على استشارة مجانية وعرض سعر خلال 24 ساعة", "Contact us now and get a free consultation and price quote within 24 hours")}
              </motion.p>
              <motion.div
                variants={fadeInUp}
                custom={2}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Link href="/quote">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="w-full sm:w-auto px-8 h-12 bg-white text-[#0F2557] hover:bg-[#EFF6FF]/60 shadow-lg rounded-xl text-base font-semibold">
                      <Sparkles className="w-4 h-4 me-2" />
                      {t("طلب عرض سعر", "Request a Quote")}
                    </Button>
                  </motion.div>
                </Link>
                <a href={`tel:${company.phone}`}>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto px-8 h-12 border-white/30 text-white hover:bg-white/10 rounded-xl text-base"
                  >
                    <Phone className="w-4 h-4 me-2" />
                    {t("اتصل بنا", "Call Us")}
                  </Button>
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
