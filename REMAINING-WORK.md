# 🔵 BluePrint ERP — خريطة العمل المتبقي المحدثة (Remaining Work Roadmap)
## تاريخ آخر تحديث: 2026-06-19

---

## ✅ الإصلاحات المكتملة حديثاً (Completed Work)

| # | الإصلاح | الأولوية | الحالة | الملفات المتأثرة |
|---|---------|---------|--------|------------------|
| 1 | أصلح Middleware Matcher للحماية على الـ APIs | 🔴 حرج | ✅ مكتمل | `src/middleware.ts`, `src/auth-proxy.ts` |
| 2 | أصلح WebSocket join_organization (إضافة تحقق) | 🔴 حرج | ✅ مكتمل | `mini-services/chat-service/index.ts` |
| 3 | أصلح ثغرة IDOR Bypass في chat-service عند فشل الـ DB | 🔴 حرج | ✅ مكتمل | `mini-services/chat-service/index.ts` |
| 4 | أصلح مؤشرات الكتابة (Typing Indicators) وتطابق الغرف | 🔴 حرج | ✅ مكتمل | `src/lib/websocket/websocket-service.ts` |
| 5 | توحيد صيغة تسمية غرف الـ WebSocket وإضافة البادئة `org:` | 🟠 كبير | ✅ مكتمل | `mini-services/chat-service/index.ts` |
| 6 | إصلاح حقل التسجيل `organizationId` في الـ Prisma Schema | 🔴 حرج | ✅ مكتمل | `prisma/schema.prisma`, `schema.postgresql.prisma` |
| 7 | إزالة كود التسجيل الميت (Dead Register Code) من الـ store | 🟡 متوسط | ✅ مكتمل | `src/store/auth-store.ts` |
| 8 | تحسين الـ Session Polling ليعتمد على الـ Visibility State | 🟡 متوسط | ✅ مكتمل | `src/store/auth-store.ts` |
| 9 | تنظيف الملفات الفارغة والمجلدات الميتة (`{` و `blue-app-fix/`) | 🟢 منخفض | ✅ مكتمل | جذر المستودع |
| 10| تحديث نسخ Next.js 16 و React 19 في الـ README | 🟠 كبير | ✅ مكتمل | `README.md` |
| 11| توحيد مكتبات الـ JWT واستبدالها بـ `jose` | 🟠 كبير | ✅ مكتمل | `mini-services/chat-service/`, `src/lib/auth/` |
| 12| دمج الـ Prisma Schema المزدوجة واستخدام Dynamic Database Provider | 🔴 حرج | ✅ مكتمل | `prisma/schema.prisma` |
| 13| حل مشكلة أنواع Stripe API وتحديث الإصدار لتطابق TypeScript | 🟡 متوسط | ✅ مكتمل | `src/lib/stripe.ts` |
| 14| تكامل اختبارات Playwright E2E للمسارات الأساسية (الدخول، الفواتير، المشاريع) | 🟠 كبير | ✅ مكتمل | `e2e/core-flows.spec.ts` |
| 15| تكامل سياسة أمان المحتوى (CSP) مع معرفات فريدة nonce في ترويسات الطلب | 🔴 حرج | ✅ مكتمل | `src/auth-proxy.ts` |
| 16| تفعيل التحقق بخطوتين الإضافي (Step-up 2FA) للمسارات الحساسة | 🟠 كبير | ✅ مكتمل | `src/lib/auth/step-up-2fa.ts`, `src/app/api/profile/delete-account/route.ts`, `src/app/api/profile/password/route.ts`, `src/app/api/stripe/subscriptions/route.ts` |
| 17| صفحة عرض آمنة لبيانات الدخول التجريبية (One-time Setup Token) | 🟠 كبير | ✅ مكتمل | `src/app/setup-complete/page.tsx`, `src/app/api/auth/setup-complete/route.ts`, `setup.sh` |
| 18| اختبارات E2E لدورة الفواتير والمدفوعات (Billing Flow) | 🟠 كبير | ✅ مكتمل | `e2e/invoice-payment-flow.spec.ts` |
| 19| تحديث شامل لملف README مع إزالة توصية Vercel الخاطئة | 🟠 كبير | ✅ مكتمل | `README.md` |
| 20| إصلاح ثغرة أمنية في `nodemailer` (GHSA-p6gq-j5cr-w38f) — ترقية للإصدار 9.0.1 | 🔴 حرج | ✅ مكتمل | `package.json` |
| 21| إصلاح أخطاء الـ TypeScript وأخطاء الـ ESLint الـ 9 (تنظيف `eslint-disable` الميت) | 🟡 متوسط | ✅ مكتمل | 8 ملفات (عبر `eslint --fix`) |
| 22| إزالة `'unsafe-inline'` من CSP للأنماط (styles) واستخدام nonce | 🟡 متوسط | ✅ مكتمل | `src/lib/middleware/security.ts` |
| 23| اختبارات تكامل للـ Step-up 2FA على المسارات الحساسة | 🟡 متوسط | ✅ مكتمل | `__tests__/integration/step-up-2fa-flow.test.ts` |

---

## 🟡 العمل المتوسط والمنخفض المتبقي (Remaining Backlog)

### m6. تفعيل حماية الفرع الرئيسي (Branch Protection) — يتطلب تدخل يدوي
- **الوصف**: تفعيل إعدادات حماية الفرع `main` من إعدادات GitHub:
  - Require a pull request before merging
  - Require approvals (1+)
  - Require status checks (Lint, Unit Tests, Build, Security Audit)
  - Require linear history
  - Require conversation resolution
- **الخطوات**: راجع [README.md → حماية الفرع الرئيسي](README.md#-حماية-الفرع-الرئيسي-branch-protection)

### m7. مراجعة ودمج طلب سحب Dependabot #26
- **الوصف**: طلب سحب مفتوح لتحديث 17 حزمة برمجية.
- **الخطوات**: راجع [PR #26](https://github.com/mohamedblueprintrak-design/blue-app/pull/26) وتأكد من عدم وجود breaking changes قبل الدمج.

### m8. اختبار استعادة النسخ الاحتياطي (Backup Restore Test)
- **الوصف**: إضافة سكريبت يجرّب استعادة الـ backup تلقائياً للتحقق من سلامته.
- **السبب**: "backup لم تجرّب restoreه = مش backup أصلاً"
- **الملفات المتأثرة**: `scripts/backup.sh`, `scripts/backup-entrypoint.sh`

### m9. توسعة اختبارات E2E للـ flows الإضافية
- **الوصف**: إضافة اختبارات Playwright للـ flows التالية:
  - إنشاء فاتورة فعلي → تسجيل دفعة → التحقق من قاعدة البيانات
  - تدفق الموافقات (Approvals Workflow)
  - عزل Multi-tenant في scenarios حقيقية

### m10. رفع حدود تغطية الاختبارات (Coverage Thresholds)
- **الوصف**: رفع الـ thresholds في `jest.config.ts` من 60-80% إلى 80%+ global.
- **السبب**: لتطبيق enterprise، المعيار هو 80%+ global.

### m11. Storybook لمكونات الواجهة
- **الوصف**: إضافة Storybook للـ reusable UI components (53 shadcn + custom).
- **السبب**: 269 ملف في `src/components/pages/` — رقم ضخم يحتاج isolated testing.

### m12. Visual Regression Testing
- **الوصف**: إضافة Playwright screenshot comparison (Percy أو Chromatic).
- **السبب**: مع 66 صفحة dashboard، أي refactor ممكن يكسر UI بدون ما حد يلاحظ.

### m13. ISR للصفحات العامة
- **الوصف**: استخدام `revalidate = 3600` للصفحات العامة (about, services, privacy, terms).
- **السبب**: تقليل الـ server load بدلاً من SSR في كل طلب.

### m14. نقل ملفات الـ docs إلى مجلد `docs/`
- **الوصف**: نقل `REMAINING-WORK.md` و `MIGRATION.md` و `DEPLOYMENT.md` إلى `docs/`.
- **السبب**: جذر المستودع يحتوي على 39 ملف — كثير جداً.
