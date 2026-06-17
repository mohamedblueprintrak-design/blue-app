"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Smartphone,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { SkipNavContent } from "@/components/common/accessible-components";
import { extractErrorMessage } from "@/lib/api/fetch-client";

export default function TwoFASetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "setup" | "verify" | "backup" | "DONE">("loading");
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/auth/2fa");
      const data = await res.json();
      setEnabled(data.enabled || false);

      if (data.enabled) {
        setStep("DONE");
      } else if (data.secret) {
        setSecret(data.secret);
        setQrCode(data.qrCode || "");
        setStep("verify");
      } else {
        setStep("setup");
      }
    } catch {
      setError("حدث خطأ في تحميل البيانات");
      setStep("setup");
    }
  };

  const setup2FA = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });

      const data = await res.json();

      if (res.ok) {
        setSecret(data.secret);
        setQrCode(data.qrCode || "");
        setStep("verify");
      } else {
        setError(extractErrorMessage(data.error, "حدث خطأ"));
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const verify2FA = async () => {
    if (!code || code.length !== 6) {
      setError("أدخل الرمز المكون من 6 أرقام");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", code }),
      });

      const data = await res.json();

      if (res.ok) {
        setBackupCodes(data.backupCodes || []);
        setStep("backup");
        setEnabled(true);
      } else {
        setError(extractErrorMessage(data.error, "رمز غير صحيح"));
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const disable2FA = async () => {
    if (!code || code.length < 1) {
      setError("أدخل كلمة المرور للتعطيل");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: code }),
      });

      const data = await res.json();

      if (res.ok) {
        setEnabled(false);
        setStep("setup");
        setCode("");
      } else {
        setError(extractErrorMessage(data.error, "رمز غير صحيح"));
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <SkipNavContent />
      <Card className="w-full max-w-lg border-slate-200 dark:border-slate-700/50 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            التوثيق الثنائي (2FA)
            {enabled && (
              <Badge className="bg-green-500 text-white">مفعّل</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-500" />
              <p className="mt-4 text-slate-600 dark:text-slate-400">جارٍ التحميل...</p>
            </div>
          )}

          {step === "setup" && (
            <div className="space-y-6 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                قم بتفعيل التوثيق الثنائي لحماية حسابك بشكل إضافي
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 justify-center">
                  <Smartphone className="h-4 w-4 text-violet-500" />
                  كيف يعمل؟
                </h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 text-end">
                  <li>1. حمّل تطبيق Google Authenticator أو Authy</li>
                  <li>2. امسح رمز QR أو أدخل المفتاح يدوياً</li>
                  <li>3. أدخل الرمز المكون من 6 أرقام للتأكيد</li>
                </ul>
              </div>

              <Button
                onClick={setup2FA}
                disabled={submitting}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Shield className="h-4 w-4 me-2" />
                )}
                بدء الإعداد
              </Button>

              <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
                <ArrowLeft className="h-4 w-4 me-2" />
                العودة
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  امسح رمز QR أو أدخل المفتاح يدوياً في تطبيق المصادقة
                </p>

                {qrCode && (
                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <Image src={qrCode} alt="QR Code" className="w-48 h-48" width={192} height={192} />
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">المفتاح السري:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="font-mono text-sm bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                      {secret}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(secret)}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">رمز التحقق</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  dir="ltr"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              )}

              <Button
                onClick={verify2FA}
                disabled={code.length !== 6 || submitting}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Check className="h-4 w-4 me-2" />
                )}
                تأكيد التفعيل
              </Button>
            </div>
          )}

          {step === "backup" && (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">احفظ هذه الرموز!</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      استخدم هذه الرموز للوصول لحسابك في حال فقدان جهازك
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <code
                      key={i}
                      className="font-mono text-sm bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => {
                  copyToClipboard(backupCodes.join("\n"));
                }}
                variant="outline"
                className="w-full"
              >
                {copied ? <Check className="h-4 w-4 me-2 text-green-500" /> : <Copy className="h-4 w-4 me-2" />}
                نسخ جميع الرموز
              </Button>

              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                <CheckCircle className="h-4 w-4 me-2" />
                تم الإعداد بنجاح
              </Button>
            </div>
          )}

          {step === "DONE" && (
            <div className="space-y-6 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h4 className="font-semibold text-green-800 dark:text-green-200">
                  التوثيق الثنائي مفعّل
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  حسابك محمي بطبقة أمان إضافية
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disableCode">لإلغاء التفعيل، أدخل كلمة المرور</Label>
                <Input
                  id="disableCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  dir="ltr"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <Button
                onClick={disable2FA}
                disabled={code.length < 1 || submitting}
                variant="destructive"
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Shield className="h-4 w-4 me-2" />
                )}
                إلغاء التفعيل
              </Button>

              <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
                <ArrowLeft className="h-4 w-4 me-2" />
                العودة
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
