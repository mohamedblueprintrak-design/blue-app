"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  Mail,
  Loader2,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { extractErrorMessage } from "@/lib/api/fetch-client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success">("form");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
      } else {
        setError(extractErrorMessage(data.error, "حدث خطأ"));
        setStatus("form");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
      setStatus("form");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md border-slate-200 dark:border-slate-700/50 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4">
            {status === "success" ? (
              <CheckCircle className="h-8 w-8 text-white" />
            ) : (
              <KeyRound className="h-8 w-8 text-white" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === "success" ? "تم الإرسال بنجاح!" : "نسيت كلمة المرور؟"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(status === "form" || status === "loading") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
                أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="ps-10"
                    dir="ltr"
                    required
                    disabled={status === "loading"}
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <Button
                type="submit"
                disabled={!email || status === "loading"}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Mail className="h-4 w-4 me-2" />
                )}
                إرسال رابط إعادة التعيين
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                العودة لتسجيل الدخول
              </Button>
            </form>
          )}

          {status === "success" && (
            <div className="space-y-4 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
              </p>
              <p className="text-sm text-slate-500">
                إذا لم تجد الرابط، تحقق من مجلد البريد المزعج (Spam)
              </p>
              <Button
                onClick={() => router.push("/dashboard")}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                العودة للصفحة الرئيسية
                <ArrowRight className="h-4 w-4 ms-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
