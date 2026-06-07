"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Scale, Shield, AlertTriangle, RefreshCw, Mail } from "lucide-react";
import PublicHeader from "@/components/layout/public-header";
import { SkipNavContent } from "@/components/common/accessible-components";
import PublicFooter from "@/components/layout/public-footer";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

export default function TermsPage() {
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("blueprint-lang") as "ar" | "en" | null;
    if (saved) setLanguage(saved);

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

  const t = (ar: string, en: string) => (!mounted || language === "ar" ? ar : en);

  const sections = [
    {
      icon: Scale,
      titleAr: "1. قبول الشروط",
      titleEn: "1. Acceptance of Terms",
      contentAr: "باستخدامك لمنصة BluePrint، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام المنصة. يُعتبر استمرارك في استخدام المنصة بعد نشر أي تعديلات قبولاً منك لتلك التعديلات. نحتفظ بالحق في تعديل هذه الشروط في أي وقت، وسيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار على المنصة.",
      contentEn: "By using the BluePrint platform, you agree to comply with these Terms and Conditions. If you do not agree with any part of these terms, please do not use the platform. Your continued use of the platform after any modifications are posted constitutes your acceptance of those changes. We reserve the right to modify these terms at any time, and you will be notified of any material changes via email or a notice on the platform.",
    },
    {
      icon: FileText,
      titleAr: "2. الخدمات المقدمة",
      titleEn: "2. Services Provided",
      contentAr: "توفر BluePrint منصة إدارة مشاريع هندسية تشمل إدارة المشاريع والمهام، وإدارة العقود والفواتير، ونظام الصلاحيات والأدوار، والتقارير والتحليلات، والتواصل بين أعضاء الفريق. نحن نسعى لتوفير المنصة بتوافر لا يقل عن 99.5%، لكننا لا نضمن أن المنصة ستكون متاحة بشكل متواصل أو خالية من الأخطاء. قد يتم تعليق الخدمة مؤقتاً لأغراض الصيانة أو التحديث.",
      contentEn: "BluePrint provides an engineering project management platform including project and task management, contract and invoice management, role-based access control, reporting and analytics, and team communication. We strive to provide the platform with at least 99.5% availability, but we do not guarantee that the platform will be continuously available or error-free. The service may be temporarily suspended for maintenance or updates.",
    },
    {
      icon: Shield,
      titleAr: "3. حماية البيانات والخصوصية",
      titleEn: "3. Data Protection & Privacy",
      contentAr: "نلتزم بحماية بياناتك الشخصية وفقاً لقانون حماية البيانات الشخصية في دولة الإمارات العربية المتحدة (المرسوم بقانون اتحادي رقم 45 لسنة 2021). جميع البيانات مشفرة أثناء النقل والتخزين باستخدام بروتوكولات التشفير المتقدمة. لا نشارك بياناتك مع أطراف ثالثة إلا بموافقتك الصريحة أو كما يقتضي القانون. يمكنك طلب حذف بياناتك الشخصية في أي وقت. لمزيد من التفاصيل، يرجى مراجعة سياسة الخصوصية الخاصة بنا.",
      contentEn: "We are committed to protecting your personal data in accordance with the UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data. All data is encrypted in transit and at rest using advanced encryption protocols. We do not share your data with third parties except with your explicit consent or as required by law. You may request deletion of your personal data at any time. For more details, please refer to our Privacy Policy.",
    },
    {
      icon: AlertTriangle,
      titleAr: "4. مسؤولية المستخدم",
      titleEn: "4. User Responsibilities",
      contentAr: "أنت مسؤول عن الحفاظ على سرية بيانات حسابك وكلمة المرور الخاصة بك. يجب عليك إخطارنا فوراً في حالة أي استخدام غير مصرح به لحسابك. يُحظر استخدام المنصة لأي أغراض غير قانونية أو مخالفة للأنظمة. يجب أن تكون جميع المعلومات التي تقدمها صحيحة ودقيقة ومحدثة. أنت مسؤول عن جميع الأنشطة التي تتم تحت حسابك.",
      contentEn: "You are responsible for maintaining the confidentiality of your account credentials and password. You must notify us immediately of any unauthorized use of your account. Using the platform for any illegal or regulatory-violating purposes is prohibited. All information you provide must be accurate, truthful, and up-to-date. You are responsible for all activities under your account.",
    },
    {
      icon: RefreshCw,
      titleAr: "5. الاشتراكات والمدفوعات",
      titleEn: "5. Subscriptions & Payments",
      contentAr: "تتوفر خطط اشتراك مختلفة مع ميزات متفاوتة. سيتم تجديد الاشتراك تلقائياً في نهاية كل فترة ما لم يتم إلغاؤه قبل موعد التجديد. في حالة الإلغاء، سيظل لديك حق الوصول حتى نهاية فترة الاشتراك المدفوعة. المعاملات المالية تتم عبر بوابة دفع آمنة ومعتمدة. يتم التعامل مع جميع المدفوعات بالدرهم الإماراتي (AED) ما لم يُذكر خلاف ذلك.",
      contentEn: "Different subscription plans are available with varying features. Subscriptions will automatically renew at the end of each period unless canceled before the renewal date. Upon cancellation, you will retain access until the end of your paid subscription period. Financial transactions are processed through a secure and certified payment gateway. All payments are processed in UAE Dirhams (AED) unless otherwise stated.",
    },
    {
      icon: Mail,
      titleAr: "6. الاتصال والدعم",
      titleEn: "6. Contact & Support",
      contentAr: "لأي استفسارات بخصوص هذه الشروط، يمكنك التواصل معنا عبر البريد الإلكتروني أو من خلال صفحة الاتصال في المنصة. نهدف للرد على جميع الاستفسارات خلال يومي عمل. في حالة وجود نزاع، يخضع هذا الاتفاق لقوانين دولة الإمارات العربية المتحدة وتختص محاكم إمارة رأس الخيمة بالفصل في أي نزاع ينشأ عنه.",
      contentEn: "For any inquiries regarding these terms, you can contact us via email or through the platform's contact page. We aim to respond to all inquiries within two business days. In case of dispute, this agreement is governed by the laws of the United Arab Emirates, and the courts of Ras Al Khaimah shall have jurisdiction over any disputes arising from it.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      <main className="flex-1">
        <SkipNavContent />

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#0A1628] py-16 sm:py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="terms-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#terms-grid)" />
            </svg>
          </div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial="hidden" animate="visible">
              <motion.div variants={fadeInUp} custom={0}>
                <span className="inline-flex items-center gap-2 bg-[#0F2557]/8 border border-[#0F2557]/25 rounded-full px-4 py-1.5 text-blue-200/90 text-sm font-medium mb-4">
                  <Scale className="w-4 h-4" />
                  {t("الشروط والأحكام", "Terms & Conditions")}
                </span>
              </motion.div>
              <motion.h1 variants={fadeInUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                {t("شروط وأحكام الاستخدام", "Terms of Service")}
              </motion.h1>
              <motion.p variants={fadeInUp} custom={2} className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                {t("آخر تحديث: يونيو 2025", "Last updated: June 2025")}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-8">
              {sections.map((section, i) => {
                const Icon = section.icon;
                return (
                  <motion.div
                    key={section.titleEn}
                    variants={fadeInUp}
                    custom={i}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[#0F2557]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">
                          {t(section.titleAr, section.titleEn)}
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-sm">
                          {t(section.contentAr, section.contentEn)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
