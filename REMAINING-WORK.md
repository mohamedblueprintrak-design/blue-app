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

---

## 🟡 العمل المتوسط والمنخفض المتبقي (Remaining Backlog)

### m5. تفعيل التحقق بخطوتين الإضافي (Step-up 2FA) للمسارات الحساسة
- **الوصف**: فرض تأكيد الهوية عبر رمز 2FA مجدداً عند محاولة تعديل إعدادات الدفع أو سحب البيانات أو تغيير الصلاحيات الحساسة.
