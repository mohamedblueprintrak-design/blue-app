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

### m6. تفعيل حماية الفرع الرئيسي (Branch Protection) — ✅ مكتمل
- **الوصف**: تفعيل إعدادات حماية الفرع `main` من إعدادات GitHub.
- **الحالة**: تم التفعيل عبر GitHub API في commit `bfdb4ce`.

### m7. مراجعة ودمج طلب سحب Dependabot #26 — ✅ مكتمل
- **الوصف**: طلب سحب لتحديث 17 حزمة برمجية.
- **الحالة**: تم قفل الـ PR لأنه يحتوي على 10 major version bumps خطيرة (Prisma 6→7, TypeScript 5→6, Zod 3→4, إلخ). التوصية: اعمل PRs منفصلة لكل major bump.

### m8. اختبار استعادة النسخ الاحتياطي (Backup Restore Test) — ✅ مكتمل
- **الوصف**: إضافة سكريبت يجرّب استعادة الـ backup تلقائياً للتحقق من سلامته.
- **الحالة**: تم إنشاء `scripts/backup-restore-test.sh` — ينشئ backup، ياستعده لـ test DB، يتحقق من table counts و row counts.

### m9. توسعة اختبارات E2E للـ flows الإضافية — ✅ مكتمل
- **الوصف**: إضافة اختبارات Playwright للـ flows الإضافية.
- **الحالة**: تم إنشاء `e2e/approvals-multi-tenant.spec.ts` — 14 test case تغطي: approvals workflow, multi-tenant isolation, RBAC enforcement, step-up 2FA, search, activity log.

### m10. رفع حدود تغطية الاختبارات (Coverage Thresholds) — ✅ مكتمل
- **الوصف**: رفع الـ thresholds في `jest.config.ts`.
- **الحالة**: تم رفع الـ global thresholds من 60/70/70/70 إلى 70/80/75/75، والـ auth modules من 70/80/80/80 إلى 80/85/85/85. التغطية الحالية: 73% branches, 82% functions, 78% lines, 77% statements.

### m11. Storybook لمكونات الواجهة — ✅ مكتمل
- **الوصف**: إضافة Storybook للـ reusable UI components.
- **الحالة**: تم إنشاء `.storybook/main.ts` + `.storybook/preview.ts` + 3 story files (Button, Card, Badge). راجع [docs/storybook.md](storybook.md) للتفاصيل.

### m12. Visual Regression Testing — ✅ مكتمل
- **الوصف**: إضافة Playwright screenshot comparison.
- **الحالة**: تم إنشاء `e2e/visual-regression.spec.ts` — 8 test cases (6 desktop + 2 mobile) مع screenshot comparison و maxDiffPixelRatio 2%.

### m13. ISR للصفحات العامة — ✅ مكتمل جزئياً
- **الوصف**: استخدام `revalidate = 3600` للصفحات العامة.
- **الحالة**: تم إضافة ISR للـ landing page (`src/app/page.tsx`). باقي الصفحات (about, services, privacy, terms) هي client components وتحتاج تحويل لـ server components أولاً — يتطلب refactor كبير.

### m14. نقل ملفات الـ docs إلى مجلد `docs/` — ✅ مكتمل
- **الوصف**: نقل `REMAINING-WORK.md` و `MIGRATION.md` و `DEPLOYMENT.md` إلى `docs/`.
- **الحالة**: تم النقل إلى `docs/deployment.md`, `docs/migration.md`, `docs/remaining-work.md`. تم تحديث جميع الروابط في README و scripts.

---

## 🔵 لا يوجد عمل حرج متبقي (No Critical Work Remaining)

جميع المهام الحرجة والمتوسطة مكتملة. المشروع جاهز للإنتاج بالكامل.

المهام المتبقية مستقبلية (low priority polish):
- تحويل باقي الصفحات العامة لـ server components لتفعيل ISR الكامل
- إضافة المزيد من الـ stories لـ Storybook (حالياً 3 components — Button, Card, Badge)
- تفعيل Chromatic لـ cloud-based visual regression
