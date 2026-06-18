# 🔵 BluePrint ERP — خريطة العمل المتبقي المحدثة (Remaining Work Roadmap)
## تاريخ آخر تحديث: 2026-06-18

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

---

## 🟡 العمل المتوسط والمنخفض المتبقي (Remaining Backlog)

### m1. توحيد مكتبات الـ JWT
- **المشكلة**: التطبيق الأساسي يستعمل مكتبة `jose` المتوافقة مع الـ Edge، بينما الـ chat-service يستعمل مكتبة `jsonwebtoken` (Node-only).
- **الحل المطلوب**: توحيد المكتبتين على `jose` لتبسيط الاعتمادات وتحسين الأداء.

### m2. دمج الـ Prisma Schema المزدوجة
- **المشكلة**: وجود ملفين منفصلين للـ schema (`schema.prisma` للـ SQLite و `schema.postgresql.prisma` للـ PostgreSQL).
- **الحل المطلوب**: توحيد الـ Schema في ملف واحد مع استخدام dynamic database provider عند بدء التشغيل لتجنب حدوث أي drift مستقبلي بين القواعد.

### m3. إزالة `@ts-expect-error` الخاصة بـ Stripe API
- **الملف**: `src/lib/stripe.ts:44`
- **الحل**: تحديث حزمة Stripe SDK والـ Type definitions وحل التحذير بشكل نظيف.
