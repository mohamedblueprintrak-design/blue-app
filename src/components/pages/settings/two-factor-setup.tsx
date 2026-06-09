"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldAlert, Copy, Check } from "lucide-react";
import { getMutationHeaders } from "@/lib/csrf-client";
import { useToastFeedback } from "@/hooks/use-toast-feedback";

interface TwoFactorSetupProps {
  isAr: boolean;
}

export function TwoFactorSetup({ isAr }: TwoFactorSetupProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string; manualEntryKey: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [copied, setCopied] = useState(false);
  const toast = useToastFeedback({ ar: isAr });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/2fa", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setIsEnabled(data.data?.enabled || false);
        setIsLoading(false);
      })
      .catch((err) => { if (err.name !== 'AbortError') setIsLoading(false); });
    return () => controller.abort();
  }, []);

  const handleSetup = async () => {
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (data.success) {
        setSetupData(data.data);
        setIsSettingUp(true);
      } else {
        toast.showError(isAr ? "فشل إعداد المصادقة الثنائية" : "Failed to setup 2FA");
      }
    } catch {
      toast.showError(isAr ? "خطأ في الاتصال" : "Connection error");
    }
  };

  const handleEnable = async () => {
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ action: "enable", code: verificationCode }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEnabled(true);
        setIsSettingUp(false);
        setSetupData(null);
        toast.showSuccess(isAr ? "تم تفعيل المصادقة الثنائية بنجاح" : "2FA enabled successfully");
      } else {
        toast.showError(data.error || (isAr ? "كود التحقق غير صحيح" : "Invalid verification code"));
      }
    } catch {
      toast.showError(isAr ? "خطأ في الاتصال" : "Connection error");
    }
  };

  const handleDisable = async () => {
    const password = prompt(isAr ? "يرجى إدخال كلمة المرور لتأكيد الإلغاء" : "Please enter your password to confirm");
    if (!password) return;

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "DELETE",
        headers: getMutationHeaders(),
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEnabled(false);
        toast.showSuccess(isAr ? "تم إلغاء المصادقة الثنائية" : "2FA disabled");
      } else {
        toast.showError(data.error || (isAr ? "كلمة المرور غير صحيحة" : "Incorrect password"));
      }
    } catch {
      toast.showError(isAr ? "خطأ في الاتصال" : "Connection error");
    }
  };

  if (isLoading) return <div className="animate-pulse h-20 bg-slate-100 rounded-xl" />;

  return (
    <Card className={isEnabled ? "border-green-200" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEnabled ? "bg-green-100" : "bg-slate-100"}`}>
              {isEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-slate-500" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isAr ? "المصادقة الثنائية (2FA)" : "Two-Factor Authentication (2FA)"}
              </h3>
              <p className="text-sm text-slate-500">
                {isEnabled
                  ? isAr ? "حسابك محمي بمستوى أمان إضافي" : "Your account is protected with an extra layer of security"
                  : isAr ? "أضف طبقة أمان إضافية لحسابك باستخدام تطبيق مصادقة" : "Add an extra layer of security using an authenticator app"}
              </p>
            </div>
          </div>
          <div>
            {isEnabled ? (
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDisable}>
                {isAr ? "إلغاء التفعيل" : "Disable"}
              </Button>
            ) : !isSettingUp ? (
              <Button onClick={handleSetup} className="bg-slate-900 text-white hover:bg-slate-800">
                {isAr ? "إعداد الآن" : "Setup Now"}
              </Button>
            ) : null}
          </div>
        </div>

        {isSettingUp && setupData && (
          <div className="mt-6 p-4 border rounded-xl bg-slate-50 space-y-4">
            <p className="text-sm font-medium">
              {isAr ? "1. امسح رمز الاستجابة السريعة (QR Code) باستخدام تطبيق المصادقة (مثل Google Authenticator أو Authy)" : "1. Scan the QR code using your authenticator app (like Google Authenticator or Authy)"}
            </p>
            <div className="bg-white p-4 inline-block rounded-lg shadow-sm">
              <QRCodeSVG value={setupData.qrCodeUrl} size={150} />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                {isAr ? "أو أدخل هذا الرمز يدوياً:" : "Or enter this key manually:"}
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-slate-200 px-2 py-1 rounded text-sm font-mono tracking-widest">{setupData.manualEntryKey}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                  navigator.clipboard.writeText(setupData.manualEntryKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label className="text-sm font-medium">
                {isAr ? "2. أدخل كود التحقق (6 أرقام) من التطبيق:" : "2. Enter the 6-digit verification code from the app:"}
              </Label>
              <div className="flex gap-2">
                <Input
                  className="max-w-[200px] text-center tracking-widest font-mono text-lg"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                />
                <Button onClick={handleEnable} disabled={verificationCode.length !== 6}>
                  {isAr ? "تأكيد وتفعيل" : "Verify & Enable"}
                </Button>
                <Button variant="ghost" onClick={() => setIsSettingUp(false)}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
