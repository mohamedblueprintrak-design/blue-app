"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/use-lang";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, MessageCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERVICES } from "@/components/landing/data";

interface ContactSectionProps {
  company?: {
    phone?: string;
    email?: string;
    address?: string;
    workingHours?: string;
  };
}

export function ContactSection({ company }: ContactSectionProps = {}) {
  const { lang: language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const contactEmail = company?.email || "info@blueprint-rak.com";
  const contactPhone = company?.phone || "+971 50 161 1234";
  const contactAddress = company?.address || "رأس الخيمة، الإمارات العربية المتحدة";
  const contactWorkingHours = company?.workingHours || "08:00-17:00";

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, phone: formPhone, email: formEmail, serviceType: formType, message: formMessage }),
      });
      if (!res.ok) throw new Error(t("حدث خطأ أثناء إرسال الطلب", "An error occurred while submitting"));
      setFormSuccess(true);
      setFormName(""); setFormPhone(""); setFormEmail(""); setFormType(""); setFormMessage("");
      setTimeout(() => setFormSuccess(false), 5000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("حدث خطأ غير متوقع", "An unexpected error occurred"));
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-[#0A1628] via-[#0F2557] to-[#0A1628] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="contact-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#contact-grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-blue-200 text-sm font-medium mb-6">
              <MessageCircle className="w-4 h-4" />
              {t("تواصل معنا", "Contact Us")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">{t("ابدأ مشروعك الآن", "Start Your Project Now")}</h2>
            <p className="mt-4 text-blue-200/80 leading-relaxed max-w-lg">
              {t("أخبرنا عن مشروعك وسنقدم لك استشارة مجانية وعرض سعر تفصيلي خلال 24 ساعة", "Tell us about your project and we'll provide a free consultation and detailed quote within 24 hours")}
            </p>

            <div className="mt-10 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="text-white font-medium">{t("اتصل بنا", "Call Us")}</div>
                  <div className="text-blue-200 text-sm mt-1" dir="ltr">{contactPhone}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="text-white font-medium">{t("البريد الإلكتروني", "Email")}</div>
                  <div className="text-blue-200 text-sm mt-1">{contactEmail}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="text-white font-medium">{t("العنوان", "Address")}</div>
                  <div className="text-blue-200 text-sm mt-1">{contactAddress}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="text-white font-medium">{t("ساعات العمل", "Working Hours")}</div>
                  <div className="text-blue-200 text-sm mt-1">{contactWorkingHours}</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <form onSubmit={handleContactSubmit} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-white mb-6">{t("أرسل استفسارك", "Send Your Inquiry")}</h3>
              
              {formSuccess && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {t("تم إرسال طلبك بنجاح! سنتواصل معك قريباً", "Your request has been sent successfully! We'll contact you soon")}
                  </div>
                </div>
              )}

              {formError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">{formError}</div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="contact-name" className="text-blue-200 text-sm mb-1.5 block">{t("الاسم", "Name")}</Label>
                  <Input id="contact-name" value={formName} onChange={e => setFormName(e.target.value)} required placeholder={t("أدخل اسمك", "Enter your name")} className="bg-white/5 border-white/10 text-white placeholder:text-blue-200/40 focus:border-blue-400/50" />
                </div>
                <div>
                  <Label htmlFor="contact-phone" className="text-blue-200 text-sm mb-1.5 block">{t("رقم الهاتف", "Phone Number")}</Label>
                  <Input id="contact-phone" value={formPhone} onChange={e => setFormPhone(e.target.value)} required placeholder={contactPhone} className="bg-white/5 border-white/10 text-white placeholder:text-blue-200/40 focus:border-blue-400/50" dir="ltr" />
                </div>
                <div>
                  <Label htmlFor="contact-email" className="text-blue-200 text-sm mb-1.5 block">{t("البريد الإلكتروني", "Email")}</Label>
                  <Input id="contact-email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder={t("اختياري", "Optional")} className="bg-white/5 border-white/10 text-white placeholder:text-blue-200/40 focus:border-blue-400/50" />
                </div>
                <div>
                  <Label htmlFor="contact-type" className="text-blue-200 text-sm mb-1.5 block">{t("نوع الخدمة", "Service Type")}</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger id="contact-type" className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder={t("اختر نوع الخدمة", "Select service type")} />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map((s) => (
                        <SelectItem key={s.titleEn} value={s.titleEn}>{t(s.title, s.titleEn)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contact-message" className="text-blue-200 text-sm mb-1.5 block">{t("الرسالة", "Message")}</Label>
                  <Textarea id="contact-message" value={formMessage} onChange={e => setFormMessage(e.target.value)} placeholder={t("أخبرنا عن مشروعك...", "Tell us about your project...")} rows={4} className="bg-white/5 border-white/10 text-white placeholder:text-blue-200/40 focus:border-blue-400/50 resize-none" />
                </div>
                <Button type="submit" disabled={formSubmitting} className="w-full bg-gradient-to-r from-[#0F2557] to-[#1A4A8B] hover:from-[#1A4A8B] hover:to-[#2563EB] text-white h-12 rounded-xl font-semibold text-base shadow-[0_4px_20px_rgba(15,37,87,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_6px_30px_rgba(15,37,87,0.5)]">
                  {formSubmitting ? t("جاري الإرسال...", "Sending...") : t("إرسال الطلب", "Send Request")}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
