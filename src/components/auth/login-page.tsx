"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Eye,
  EyeOff,
  User,
  Languages,
  FolderKanban,
  ListChecks,
  BarChart3,
  Users,
  Mail,
  Lock,
  ChevronLeft,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useToast } from "@/hooks/use-toast";
import LogoImage from "@/components/ui/logo-image";
import { cn } from "@/lib/utils";
import { SkipNavContent } from "@/components/common/accessible-components";
import { extractErrorMessage } from "@/lib/api/fetch-client";

interface LoginPageProps {
  language: "ar" | "en";
}

const ROLES = [
  { value: "admin@demo.blueprint.app", labelAr: "المدير العام", labelEn: "Admin" },
  { value: "pm@demo.blueprint.app", labelAr: "مدير مشاريع", labelEn: "Manager" },
  { value: "eng@demo.blueprint.app", labelAr: "مهندس معماري", labelEn: "Arch. Eng" },
  { value: "struct@demo.blueprint.app", labelAr: "مهندس إنشائي", labelEn: "Struct. Eng" },
  { value: "elec@demo.blueprint.app", labelAr: "مهندس كهربائي", labelEn: "Elec. Eng" },
  { value: "site@demo.blueprint.app", labelAr: "مهندس موقع", labelEn: "Site Eng" },
  { value: "mep@demo.blueprint.app", labelAr: "مهندس ميكانيكا", labelEn: "MEP Eng" },
  { value: "draft@demo.blueprint.app", labelAr: "رسام", labelEn: "Draftsman" },
  { value: "acc@demo.blueprint.app", labelAr: "محاسب", labelEn: "Accountant" },
  { value: "sec@demo.blueprint.app", labelAr: "سكرتيرة", labelEn: "Secretary" },
  { value: "hr@demo.blueprint.app", labelAr: "موارد بشرية", labelEn: "HR" },
  { value: "viewer@demo.blueprint.app", labelAr: "مشاهد", labelEn: "Viewer" },
];

const FEATURES = [
  {
    icon: FolderKanban,
    titleAr: "إدارة المشاريع المتقدمة",
    titleEn: "Advanced Project Management",
    descAr: "تتبع المشاريع والمراحل والمواعيد النهائية",
    descEn: "Track projects, stages, and deadlines",
  },
  {
    icon: ListChecks,
    titleAr: "تتبع المهام الذكي",
    titleEn: "Smart Task Tracking",
    descAr: "لوحة كانبان مع أولويات وSLA",
    descEn: "Kanban board with priorities & SLA",
  },
  {
    icon: BarChart3,
    titleAr: "التقارير والتحليلات",
    titleEn: "Reports & Analytics",
    descAr: "تقارير مالية وتقارير المشاريع والإنتاجية",
    descEn: "Financial, project & productivity reports",
  },
  {
    icon: Users,
    titleAr: "إدارة الفرق والموارد",
    titleEn: "Team & Resource Management",
    descAr: "الحضور والإجازات وأحمال العمل",
    descEn: "Attendance, leave & workload tracking",
  },
];

interface DemoCredential {
  email: string;
  password: string;
  role: string;
  labelAr: string;
  labelEn: string;
}

export default function LoginPage({ language }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [demoCredentials, setDemoCredentials] = useState<DemoCredential[]>([]);
  const [featureIndex, setFeatureIndex] = useState(0);
  const dbReady = true; // DB is always ready — seeding is done via `bun run db:seed`
  const { login } = useAuthStore();
  const { toast: _toast } = useToast();

  const isAr = language === "ar";

  // Fetch demo credentials from server (only returned in demo mode)
  useEffect(() => {
    fetch('/api/auth/demo-credentials')
      .then((res) => (res.ok ? res.json() : { credentials: [] }))
      .then((data) => {
        if (Array.isArray(data.credentials)) {
          setDemoCredentials(data.credentials);
        }
      })
      .catch(() => {
        // Not in demo mode or fetch failed — no credentials available
      });
  }, []);

  // Rotate feature highlights every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(extractErrorMessage(data.error, isAr ? "حدث خطأ" : "An error occurred"));
        return;
      }

      login({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        avatar: data.avatar,
      });
    } catch {
      setError(isAr ? "حدث خطأ في الاتصال" : "Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin(email, password);
  };

  const handleRoleSelect = (value: string) => {
    setSelectedRole(value);
    setEmail(value);
    // Auto-fill demo password if available (dev/demo mode only)
    const cred = demoCredentials.find((c) => c.email === value);
    if (cred && cred.password) {
      setPassword(cred.password);
    } else {
      setPassword("");
    }
  };

  const handleForgotPassword = () => {
    // Navigate to the forgot-password page
    window.location.href = '/forgot-password';
  };

  const toggleLanguage = () => {
    const newLang = language === "ar" ? "en" : "ar";
    localStorage.setItem("blueprint-lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
    window.dispatchEvent(new Event("blueprint-lang-change"));
  };

  return (
    <div
      className="min-h-screen flex bg-white dark:bg-slate-950"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* ===== Branded Panel (hidden on mobile, visible on lg+) ===== */}
      <div className="hidden lg:flex lg:w-[520px] xl:w-[580px] relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500">
        {/* Animated background pattern */}
        <div className="absolute inset-0">
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.08]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="login-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>

          {/* Decorative circles */}
          <div className="absolute -top-24 -start-24 w-72 h-72 rounded-full border border-white/10" />
          <div className="absolute top-1/3 -end-32 w-96 h-96 rounded-full border border-white/5" />
          <div className="absolute -bottom-16 start-1/4 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute top-1/4 end-1/4 w-48 h-48 rounded-full bg-cyan-400/10 blur-3xl" />

          {/* Compass Rose */}
          <svg
            className="absolute top-8 end-8 w-32 h-32 opacity-[0.1]"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="60" stroke="white" strokeWidth="0.3" />
            <circle cx="100" cy="100" r="40" stroke="white" strokeWidth="0.2" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="white" strokeWidth="0.3" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="white" strokeWidth="0.3" />
            <line x1="40" y1="40" x2="160" y2="160" stroke="white" strokeWidth="0.3" />
            <line x1="160" y1="40" x2="40" y2="160" stroke="white" strokeWidth="0.3" />
          </svg>

          {/* UAE / Engineering decorative element */}
          <svg
            className="absolute bottom-12 end-12 w-24 h-24 opacity-[0.08]"
            viewBox="0 0 100 100"
            fill="none"
          >
            <rect x="10" y="60" width="80" height="30" rx="2" stroke="white" strokeWidth="0.8" />
            <path d="M10 60 L50 20 L90 60" stroke="white" strokeWidth="0.8" fill="none" />
            <line x1="30" y1="40" x2="30" y2="60" stroke="white" strokeWidth="0.5" />
            <line x1="50" y1="20" x2="50" y2="60" stroke="white" strokeWidth="0.5" />
            <line x1="70" y1="40" x2="70" y2="60" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Logo & Brand */}
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <LogoImage size={48} className="border border-white/40" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  BluePrint
                </h1>
                <p className="text-[11px] text-white/60 font-medium">
                  {isAr ? "نظام إدارة الاستشارات الهندسية" : "Engineering Consultancy Management"}
                </p>
              </div>
            </div>
          </div>

          {/* Feature Highlights - Center */}
          <div className="flex-1 flex items-center">
            <div className="w-full space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-white/80 font-medium">
                    {isAr ? "مزايا النظام" : "System Features"}
                  </span>
                </div>

                <div className="space-y-4">
                  {FEATURES.map((feat, idx) => {
                    const FeatIcon = feat.icon;
                    const isActive = idx === featureIndex;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-4 transition-all duration-500",
                          isActive
                            ? "opacity-100 translate-y-0"
                            : "opacity-30 translate-y-1"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500",
                            isActive
                              ? "bg-white/20 backdrop-blur-sm border border-white/20"
                              : "bg-white/5 border border-transparent"
                          )}
                        >
                          <FeatIcon className={cn(
                            "w-5 h-5 transition-all duration-500",
                            isActive ? "text-white" : "text-white/40"
                          )} />
                        </div>
                        <div className="pt-1.5">
                          <h3 className={cn(
                            "text-sm font-semibold transition-all duration-500",
                            isActive ? "text-white" : "text-white/40"
                          )}>
                            {isAr ? feat.titleAr : feat.titleEn}
                          </h3>
                          {isActive && (
                            <p className="text-xs text-white/60 mt-1 animate-fade-in">
                              {isAr ? feat.descAr : feat.descEn}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feature indicator dots */}
              <div className="flex items-center gap-2 pt-2">
                {FEATURES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFeatureIndex(idx)}
                    className={cn(
                      "rounded-full transition-all duration-300 cursor-pointer",
                      idx === featureIndex
                        ? "w-6 h-2 bg-white"
                        : "w-2 h-2 bg-white/30 hover:bg-white/50"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="animate-fade-in">
            <p className="text-xs text-white/40 leading-relaxed">
              {isAr
                ? "حلول هندسية متكاملة لإدارة مكاتب الاستشارات في الإمارات العربية المتحدة"
                : "Comprehensive engineering solutions for consultancy management in the UAE"}
            </p>
            <p className="text-[11px] text-white/25 mt-2">
              © 2025 BluePrint
            </p>
          </div>
        </div>
      </div>

      {/* ===== Login Form Side ===== */}
      <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <SkipNavContent />
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6">
          <div className="w-full max-w-sm animate-fade-in">
            {/* ===== Login Card with Animated Gradient Border + Frosted Glass ===== */}
            <div className="login-gradient-border rounded-2xl">
              <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 space-y-5 shadow-xl shadow-slate-900/5 dark:shadow-black/20">
                {/* Logo for mobile / top branding */}
                <div className="text-center space-y-3">
                  <div className="inline-flex relative">
                    <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 blur-lg opacity-30" />
                    <LogoImage size={64} className="relative shadow-lg shadow-teal-500/20" />
                    <div className="absolute -bottom-0.5 -end-0.5 w-5 h-5 rounded-full bg-cyan-400 border-2 border-white dark:border-slate-950" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {isAr ? "تسجيل الدخول" : "Sign In"}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {isAr
                        ? "مرحباً بك، أدخل بياناتك للمتابعة"
                        : "Welcome back, enter your credentials to continue"}
                    </p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm animate-scale-in">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {isAr ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        placeholder={isAr ? "أدخل بريدك الإلكتروني" : "Enter your email"}
                        value={email || ""}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={cn(
                          "h-11 ps-10 bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
                          "focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-200",
                          "placeholder:text-slate-400",
                          error && "border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20"
                        )}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {isAr ? "كلمة المرور" : "Password"}
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                      >
                        {isAr ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={isAr ? "أدخل كلمة المرور" : "Enter your password"}
                        value={password || ""}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={cn(
                          "h-11 ps-10 pe-11 bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
                          "focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-200",
                          "placeholder:text-slate-400",
                          error && "border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20"
                        )}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me + Role Selector row */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {isAr ? "تذكرني" : "Remember me"}
                      </span>
                    </label>

                    <Select value={selectedRole} onValueChange={handleRoleSelect}>
                      <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                        <User className="h-3 w-3 me-1.5 text-slate-400" />
                        <SelectValue placeholder={isAr ? "اختر الدور" : "Select Role"} />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {isAr ? role.labelAr : role.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !dbReady}
                    className={cn(
                      "w-full h-11 bg-gradient-to-r from-teal-500 to-cyan-500",
                      "hover:from-teal-600 hover:to-cyan-600 text-white font-medium",
                      "shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40",
                      "transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-2",
                      !dbReady && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {!dbReady ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                        {isAr ? "جاري تهيئة النظام..." : "Initializing..."}
                      </>
                    ) : isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                        {isAr ? "جاري تسجيل الدخول..." : "Signing in..."}
                      </>
                    ) : (
                      <>
                        {isAr ? "تسجيل الدخول" : "Sign In"}
                        <ChevronLeft className="h-4 w-4 ms-2 rtl:rotate-180" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Demo Mode Banner */}
                {demoCredentials.length > 0 && selectedRole && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2 animate-scale-in">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        {isAr ? "وضع العرض — كلمة المرور تم تعبأتها تلقائياً" : "Demo mode — Password auto-filled"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Separator */}
                <Separator className="bg-slate-200/80 dark:bg-slate-800" />

                {/* Footer inside card */}
                <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                  © 2025 BluePrint - {isAr ? "نظام إدارة الاستشارات الهندسية" : "Engineering Consultancy Management"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Language Toggle */}
        <div className="px-6 sm:px-8 py-4">
          <div className="max-w-sm mx-auto flex items-center justify-center">
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              <Languages className="h-3.5 w-3.5" />
              <span>{isAr ? "English" : "العربية"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
