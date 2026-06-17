"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { SkipNavContent } from "@/components/common/accessible-components";
import { extractErrorMessage } from "@/lib/api/fetch-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "resend">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("resend");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.data?.message || data.message || "تم التحقق من بريدك الإلكتروني بنجاح");
          setTimeout(() => router.push("/dashboard"), 3000);
        } else {
          setStatus("error");
          setMessage(extractErrorMessage(data.error, "حدث خطأ أثناء التحقق"));
        }
      } catch {
        setStatus("error");
        setMessage("حدث خطأ في الاتصال");
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.data?.message || data.message || "تم إرسال رابط التحقق إلى بريدك الإلكتروني");
      } else {
        setMessage(extractErrorMessage(data.error, "حدث خطأ"));
      }
    } catch {
      setMessage("حدث خطأ في الاتصال");
    } finally {
      setResending(false);
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
              <Mail className="h-8 w-8 text-white" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === "loading"
              ? "جارٍ التحقق..."
              : status === "success"
              ? "تم التحقق بنجاح!"
              : status === "error"
              ? "حدث خطأ"
              : "تحقق من بريدك الإلكتروني"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && (
            <p className="text-slate-600 dark:text-slate-400">
              جارٍ التحقق من البريد الإلكتروني...
            </p>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">{message}</p>
              <p className="text-sm text-slate-500">سيتم تحويلك للصفحة الرئيسية...</p>
              <Button onClick={() => router.push("/dashboard")} className="bg-teal-600 hover:bg-teal-700">
                الذهاب للصفحة الرئيسية
                <ArrowRight className="h-4 w-4 ms-2" />
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="text-red-600 dark:text-red-400">{message}</p>
              <Button
                variant="outline"
                onClick={() => setStatus("resend")}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 me-2" />
                إرسال رابط جديد
              </Button>
            </div>
          )}

          {status === "resend" && (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                أدخل بريدك الإلكتروني وسنرسل لك رابط تحقق جديد
              </p>
              <div className="space-y-2">
                <Label htmlFor="EMAIL">البريد الإلكتروني</Label>
                <Input
                  id="EMAIL"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="text-end"
                  dir="ltr"
                />
              </div>
              <Button
                onClick={handleResend}
                disabled={!email || resending}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Mail className="h-4 w-4 me-2" />
                )}
                إرسال رابط التحقق
              </Button>
              {message && <p className="text-sm text-slate-500">{message}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
