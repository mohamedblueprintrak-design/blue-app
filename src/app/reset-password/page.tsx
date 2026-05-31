"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { SkipNavContent } from "@/components/common/accessible-components";
import { extractErrorMessage } from "@/lib/api/fetch-client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "form" | "success" | "error">("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("رابط إعادة التعيين غير صالح");
      return;
    }
    setStatus("form");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setTimeout(() => router.push("/"), 3000);
      } else {
        setError(extractErrorMessage(data.error, "حدث خطأ"));
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <SkipNavContent />
      <Card className="w-full max-w-md border-slate-200 dark:border-slate-700/50 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-4">
            {status === "loading" ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : status === "success" ? (
              <CheckCircle className="h-8 w-8 text-white" />
            ) : status === "error" ? (
              <XCircle className="h-8 w-8 text-white" />
            ) : (
              <Lock className="h-8 w-8 text-white" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === "loading"
              ? "جارٍ التحقق..."
              : status === "success"
              ? "تم تغيير كلمة المرور!"
              : status === "error"
              ? "حدث خطأ"
              : "كلمة مرور جديدة"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <p className="text-center text-slate-600 dark:text-slate-400">
              جارٍ التحقق من الرابط...
            </p>
          )}

          {status === "error" && (
            <div className="space-y-4 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button
                variant="outline"
                onClick={() => router.push("/forgot-password")}
                className="w-full"
              >
                طلب رابط جديد
              </Button>
            </div>
          )}

          {status === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
                أدخل كلمة المرور الجديدة
              </p>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="ps-10 pe-10"
                    dir="ltr"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="ps-10"
                    dir="ltr"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <Button
                type="submit"
                disabled={!password || !confirmPassword || submitting}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <KeyRound className="h-4 w-4 me-2" />
                )}
                تغيير كلمة المرور
              </Button>
            </form>
          )}

          {status === "success" && (
            <div className="space-y-4 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                تم تغيير كلمة المرور بنجاح!
              </p>
              <p className="text-sm text-slate-500">
                سيتم تحويلك للصفحة الرئيسية...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
