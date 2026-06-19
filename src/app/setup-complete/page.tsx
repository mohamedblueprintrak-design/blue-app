'use client';

/**
 * Setup Complete Page
 * صفحة عرض بيانات الدخول بعد الإعداد
 *
 * - المستخدم بيدخل الـ setup token (اللي `setup.sh` بيطبنه في الـ terminal)
 * - الصفحة بتبعت الـ token للـ API
 * - الـ API بيرجع الـ credentials لمرة واحدة بس
 * - الـ token بيتـ consume بعد أول استخدام
 * - الصفحة بتعرض الـ credentials مع copy buttons
 * - بعد 60 ثانية، الصفحة بتمسح الـ credentials من الـ DOM
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, AlertTriangle, Eye, EyeOff, LogIn, Clock, ShieldCheck } from 'lucide-react';

interface Credential {
  email: string;
  password: string;
  role: string;
  labelAr: string;
  labelEn: string;
}

const AUTO_CLEAR_SECONDS = 120; // 2 minutes

export default function SetupCompletePage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credential[] | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(AUTO_CLEAR_SECONDS);

  // Auto-clear countdown
  useEffect(() => {
    if (!credentials) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Clear credentials
          setCredentials(null);
          setExpiresAt(null);
          setError('انتهى وقت العرض. لقد تم مسح البيانات من الشاشة لأسباب أمنية. أعد إدخال الرمز لعرضها مرة أخرى.');
          return AUTO_CLEAR_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [credentials]);

  // Read token from URL query param if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('الرجاء إدخال رمز الإعداد');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/setup-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken: token.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error?.message || 'حدث خطأ غير متوقع');
        setCredentials(null);
        return;
      }

      setCredentials(data.credentials);
      setExpiresAt(data.expiresAt);
      setSecondsLeft(AUTO_CLEAR_SECONDS);
      // Clear the token from input for security (don't keep it in the DOM)
      setToken('');
    } catch (err) {
      setError('فشل الاتصال بالخادم. تأكد من أن التطبيق يعمل.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        setError('فشل النسخ. الرجاء النسخ يدوياً.');
      }
      document.body.removeChild(textarea);
    }
  };

  const handleLogin = (email: string, password: string) => {
    // Navigate to dashboard login — credentials will need to be entered manually
    // (we don't auto-login for security reasons — the user should know the password)
    router.push('/dashboard');
    void email; void password; // acknowledged — displayed for UX hint
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            تم إعداد BluePrint بنجاح
          </h1>
          <p className="text-muted-foreground">
            أدخل رمز الإعداد لعرض بيانات الدخول التجريبية
          </p>
        </div>

        {/* Token Input Form */}
        {!credentials && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                الرمز مؤقت — صالح لمدة 24 ساعة
              </CardTitle>
              <CardDescription>
                تجد الرمز في نهاية مخرجات سكريبت الإعداد. كل رمز يُستخدم مرة واحدة فقط.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">رمز الإعداد (Setup Token)</Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="ألصق الرمز هنا..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono text-sm"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>خطأ</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading || !token.trim()}>
                  {loading ? 'جاري التحقق...' : 'عرض بيانات الدخول'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Credentials Display */}
        {credentials && (
          <Card className="border-emerald-500/50">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-950/30 rounded-t-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-emerald-700 dark:text-emerald-400">
                    بيانات الدخول التجريبية
                  </CardTitle>
                  <CardDescription className="mt-1">
                    ساعات:منقارب التصفير — تتبقى{' '}
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {Math.floor(secondsLeft / 60)}:
                      {(secondsLeft % 60).toString().padStart(2, '0')}
                    </span>{' '}
                    دقيقة
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPasswords ? 'إخفاء' : 'إظهار'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700 dark:text-amber-400">تحذير أمني</AlertTitle>
                <AlertDescription>
                  ستُمسح هذه البيانات من الشاشة تلقائياً خلال دقيقتين. احفظها الآن في مكان آمن.
                  لا تشاركها مع أي شخص. غيّر كلمات المرور فور أول تسجيل دخول.
                </AlertDescription>
              </Alert>

              {credentials.map((cred, idx) => (
                <div
                  key={cred.email}
                  className="border rounded-lg p-4 space-y-2 bg-background hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {cred.role}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {cred.labelAr}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Email */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">البريد الإلكتروني</Label>
                      <div className="flex gap-2">
                        <Input
                          value={cred.email}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(cred.email, `email-${idx}`)}
                          title="نسخ"
                        >
                          {copiedField === `email-${idx}` ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">كلمة المرور</Label>
                      <div className="flex gap-2">
                        <Input
                          value={showPasswords ? cred.password : '••••••••••'}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(cred.password, `pwd-${idx}`)}
                          title="نسخ"
                        >
                          {copiedField === `pwd-${idx}` ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleLogin(cred.email, cred.password)}
                  >
                    <LogIn className="w-4 h-4 ml-2" />
                    الذهاب إلى صفحة الدخول
                  </Button>
                </div>
              ))}

              {expiresAt && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  تنتهي صلاحية الرمز في: {new Date(expiresAt).toLocaleString('ar-AE', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCredentials(null);
                    setExpiresAt(null);
                    setError(null);
                  }}
                >
                  عرض مرة أخرى برمز جديد
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer note */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            🔒 لاستخدام رمز جديد، أعد تشغيل{' '}
            <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">setup.sh</code>
          </p>
          <p>
            <a href="/dashboard" className="text-primary hover:underline">
              الذهاب مباشرة إلى تسجيل الدخول ←
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
