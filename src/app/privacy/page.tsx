"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, Database, Share2, Cookie, UserCheck, Globe, Mail } from "lucide-react";
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

const emptySubscribe = () => () => {};

function useLang() {
  const language = useSyncExternalStore(
    (onChange) => {
      const handler = () => onChange();
      window.addEventListener("blueprint-lang-change", handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener("blueprint-lang-change", handler);
        window.removeEventListener("storage", handler);
      };
    },
    () => (localStorage.getItem("blueprint-lang") as "ar" | "en") || "ar",
    () => "ar" as const
  );
  return language;
}

export default function PrivacyPage() {
  const language = useLang();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const t = (ar: string, en: string) => (!mounted || language === "ar" ? ar : en);

  const sections = [
    {
      icon: Eye,
      titleAr: "1. البيانات التي نجمعها",
      titleEn: "1. Data We Collect",
      contentAr: "نجمع البيانات الضرورية فقط لتقديم خدماتنا، وتشمل: بيانات الحساب (الاسم، البريد الإلكتروني، رقم الهاتف، المسمى الوظيفي)، بيانات الاستخدام (سجل الدخول، الصفحات التي تزورها، الإجراءات التي تتخذها)، بيانات الجهاز (نوع المتصفح، نظام التشغيل، عنوان IP)، وبيانات المشروع (المعلومات التي تدخلها في مشاريعك ومهامك). لا نجمع بيانات حساسة مثل أرقام البطاقات البنكية مباشرة - يتم التعامل مع المدفوعات عبر بوابة دفع آمنة ومعتمدة (Stripe).",
      contentEn: "We collect only the data necessary to provide our services, including: Account data (name, email, phone number, job title), Usage data (login history, pages visited, actions taken), Device data (browser type, operating system, IP address), and Project data (information you enter in your projects and tasks). We do not collect sensitive data such as credit card numbers directly — payments are processed through a secure and certified payment gateway (Stripe).",
    },
    {
      icon: Database,
      titleAr: "2. كيف نستخدم بياناتك",
      titleEn: "2. How We Use Your Data",
      contentAr: "نستخدم بياناتك لتقديم الخدمات المطلوبة وتحسينها، بما في ذلك: تشغيل المنصة وصيانتها، وتحسين تجربة المستخدم، وإرسال إشعارات مهمة حول حسابك، وتقديم الدعم الفني، والامتثال للمتطلبات القانونية والتنظيمية. لا نبيع بياناتك الشخصية لأطراف ثالثة تحت أي ظرف. قد نستخدم بيانات الاستخدام المجمعة (بدون معلومات تعريفية) لأغراض التحليل الإحصائي.",
      contentEn: "We use your data to deliver and improve the requested services, including: Operating and maintaining the platform, Improving user experience, Sending important notifications about your account, Providing technical support, and Complying with legal and regulatory requirements. We do not sell your personal data to third parties under any circumstances. We may use aggregated usage data (without identifying information) for statistical analysis purposes.",
    },
    {
      icon: Lock,
      titleAr: "3. التدابير الأمنية",
      titleEn: "3. Security Measures",
      contentAr: "نتخذ تدابير أمنية متقدمة لحماية بياناتك، تشمل: تشفير البيانات أثناء النقل باستخدام TLS 1.3، وتشفير البيانات المخزنة باستخدام AES-256-GCM، وتشفير كلمات المرور باستخدام bcrypt، والمصادقة الثنائية (2FA) المتاحة لجميع المستخدمين، وعزل بيانات المؤسسات (كل مؤسسة في بيئة منفصلة)، ومراقبة الأمن على مدار الساعة مع تنبيهات فورية لأي نشاط مشبوه. نُجري اختبارات أمنية دورية ونلتزم بأفضل ممارسات أمن التطبيقات.",
      contentEn: "We implement advanced security measures to protect your data, including: Data encryption in transit using TLS 1.3, Data encryption at rest using AES-256-GCM, Password hashing using bcrypt, Two-factor authentication (2FA) available for all users, Organization data isolation (each organization in a separate environment), and 24/7 security monitoring with instant alerts for suspicious activity. We conduct regular security testing and adhere to application security best practices.",
    },
    {
      icon: Share2,
      titleAr: "4. مشاركة البيانات",
      titleEn: "4. Data Sharing",
      contentAr: "لا نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات التالية: بموافقتك الصريحة، أو للامتثال للالتزامات القانونية، أو لحماية حقوقنا أو سلامة الآخرين، أو مع مقدمي الخدمات الموثوقين الذين يعالجون البيانات بالنيابة عنا بموجب اتفاقيات سرية صارمة. مقدمو الخدمات لدينا يشملون: مزود خدمة الاستضافة، وبوابة الدفع (Stripe)، وخدمة إرسال البريد الإلكتروني.",
      contentEn: "We do not share your personal data with third parties except in the following cases: With your explicit consent, To comply with legal obligations, To protect our rights or the safety of others, or With trusted service providers who process data on our behalf under strict confidentiality agreements. Our service providers include: hosting provider, payment gateway (Stripe), and email delivery service.",
    },
    {
      icon: Cookie,
      titleAr: "5. ملفات تعريف الارتباط",
      titleEn: "5. Cookies",
      contentAr: "نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك، وتشمل: ملفات تعريف أساسية ضرورية لعمل المنصة (مثل رمز المصادقة ورمز CSRF)، وملفات تعريف تحليلية تساعدنا في فهم كيفية استخدام المنصة (مجهولة الهوية). يمكنك التحكم في إعدادات ملفات تعريف الارتباط من خلال متصفحك. لاحظ أن تعطيل بعض ملفات تعريف الارتباط قد يؤثر على وظائف المنصة.",
      contentEn: "We use cookies to improve your experience, including: Essential cookies necessary for the platform to function (such as authentication token and CSRF token), and Analytical cookies that help us understand how the platform is used (anonymized). You can control cookie settings through your browser. Note that disabling certain cookies may affect the platform's functionality.",
    },
    {
      icon: UserCheck,
      titleAr: "6. حقوقك",
      titleEn: "6. Your Rights",
      contentAr: "وفقاً لقانون حماية البيانات الشخصية في الإمارات، لديك الحقوق التالية: حق الوصول إلى بياناتك الشخصية، وحق تصحيح البيانات غير الدقيقة، وحق حذف بياناتك (الحق في النسيان)، وحق تصدير بياناتك بصيغة قابلة للقراءة، وحق الاعتراض على معالجة بياناتك، وحق سحب موافقتك في أي وقت. لممارسة أي من هذه الحقوق، يرجى التواصل معنا عبر البريد الإلكتروني.",
      contentEn: "Under the UAE Personal Data Protection Law, you have the following rights: Right to access your personal data, Right to rectify inaccurate data, Right to erasure of your data (right to be forgotten), Right to export your data in a readable format, Right to object to the processing of your data, and Right to withdraw your consent at any time. To exercise any of these rights, please contact us via email.",
    },
    {
      icon: Globe,
      titleAr: "7. النقل الدولي للبيانات",
      titleEn: "7. International Data Transfers",
      contentAr: "قد يتم تخزين بياناتك ومعالجتها في مراكز بيانات خارج دولة الإمارات العربية المتحدة. في هذه الحالة، نتخذ جميع التدابير اللازمة لضمان أن نقل بياناتك يتم وفقاً لمتطلبات قانون حماية البيانات الشخصية الإماراتي، بما في ذلك استخدام العقود النموذجية المعتمدة وضمان مستويات حماية كافية في البلد المستقبل.",
      contentEn: "Your data may be stored and processed in data centers outside the United Arab Emirates. In such cases, we take all necessary measures to ensure that the transfer of your data complies with the requirements of the UAE Personal Data Protection Law, including the use of approved standard contractual clauses and ensuring adequate protection levels in the receiving country.",
    },
    {
      icon: Mail,
      titleAr: "8. الاتصال بنا",
      titleEn: "8. Contact Us",
      contentAr: "لأي استفسارات حول سياسة الخصوصية أو لممارسة حقوقك المتعلقة بالبيانات، يمكنك التواصل معنا عبر: البريد الإلكتروني، أو صفحة الاتصال في المنصة. نهدف للرد على جميع طلبات حماية البيانات خلال 30 يوماً. مسؤول حماية البيانات لدينا متاح للتعامل مع أي مخاوف قد تكون لديك حول كيفية معالجة بياناتك الشخصية.",
      contentEn: "For any inquiries about the Privacy Policy or to exercise your data-related rights, you can contact us via: Email, or the platform's contact page. We aim to respond to all data protection requests within 30 days. Our Data Protection Officer is available to handle any concerns you may have about how your personal data is processed.",
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
                <pattern id="privacy-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#privacy-grid)" />
            </svg>
          </div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial="hidden" animate="visible">
              <motion.div variants={fadeInUp} custom={0}>
                <span className="inline-flex items-center gap-2 bg-[#0F2557]/8 border border-[#0F2557]/25 rounded-full px-4 py-1.5 text-blue-200/90 text-sm font-medium mb-4">
                  <Lock className="w-4 h-4" />
                  {t("سياسة الخصوصية", "Privacy Policy")}
                </span>
              </motion.div>
              <motion.h1 variants={fadeInUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                {t("سياسة الخصوصية وحماية البيانات", "Privacy & Data Protection Policy")}
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
