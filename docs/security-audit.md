# 🔵 BluePrint ERP — Security Audit Report

## English Summary

This document is a security audit of BluePrint ERP. Below is an English summary; the full audit is in Arabic (see the next section).

### Architecture
- **Auth:** JWT (jose) with issuer/audience/type claims, refresh-token rotation with reuse detection, 2FA (TOTP + backup codes + SMS step-up), OAuth (Google + Microsoft).
- **Authorization:** RBAC route guard in `src/auth-proxy.ts`, org-scoped Prisma queries.
- **CSRF:** Double-submit cookie pattern with timing-safe comparison.
- **CSP:** Per-request nonces; `style-src` allows `'unsafe-inline'` as a fallback for Next.js inline styles (CSP3 nonce takes precedence).
- **Rate limiting:** Tiered (per-route + global) using Redis sliding-window in `mini-services/chat-service`, in-memory for the main app.
- **Data isolation:** Multi-tenant via `organizationId` on every table; orphan users (`organizationId = null`) cannot access org data.
- **Audit logging:** `ActivityLog` and `SecurityAuditLog` models.
- **File uploads:** MIME + magic-byte validation, SSE-KMS encryption on S3.

### Audit history
- v0.1.0–v0.2.0: Initial security hardening (TOCTOU on registration, IDOR in chat-service, JWT exposure).
- v0.3.0: Stripe webhook idempotency, WhatsApp webhook signature, CSP nonce-per-request.
- v0.3.1: This release — `/login` route added, WhatsApp org resolution tightened, Sentry trace rate capped in prod, tsconfig/test coverage hygiene, SECURITY.md + CODE_OF_CONDUCT.md added.

### Known limitations
- Test coverage is ~49% — below the 80% target for financial modules.
- Commits are not yet cryptographically signed.
- `prepare-schema.js` mutates `prisma/schema.prisma` at install time (tracked for refactor).

---

## تقرير التدقيق الأمني المحدث (المحتوى الكامل بالعربية)

## تاريخ التدقيق الأمني المحدث: 2026-06-19

تمت مراجعة الكود البرمجي للمستودع بشكل كامل وفحص جميع آليات الحماية والأمان للتحقق من الادعاءات السابقة وتأكيد فاعلية الإصلاحات الأمنية.

---

## 🛡️ حالة عناصر الحماية الحالية (Verified Controls)

### 1. الـ Middleware والحماية على الـ API Routes (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: الـ Matcher في [middleware.ts](src/middleware.ts#L8) يستثني فقط مسارات الصحة والـ cron (`api/health` و `api/cron`) مع استثناءات ثابتة. هذا يعني أن الـ CSRF protection، الـ Rate limiting، والتحقق من توكن الـ JWT تعمل بفاعلية كاملة على جميع مسارات الـ APIs الحساسة في [auth-proxy.ts](src/auth-proxy.ts).

### 2. أمان الـ WebSockets وعزل المستأجرين (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: 
  * تم إصلاح ثغرة الـ `join_organization` لتشمل التحقق الكامل من هوية المستخدم ومقارنة منظمة المستخدم المستخرجة من الـ JWT مع المنظمة المطلوبة قبل السماح له بدخول الغرفة.
  * تم توحيد صيغة تسمية الغرف (Room Naming) بين التطبيق الأساسي (`websocket-service.ts`) والـ standalone `chat-service` لتكون `org:${orgId}:${entityType}:${entityId}`.
  * تم إصلاح مؤشرات الكتابة (Typing Indicators) عبر استخدام بادئة المنظمة الصحيحة، مما يضمن وصولها للمشتركين فقط وعزلها بين المستأجرين.
  * تم تأمين الـ `catch` block في الـ chat-service لمنع ثغرات الـ IDOR Bypass؛ ففي حال فشل التحقق من قاعدة البيانات، يتم رفض الاشتراك وإرسال حدث `UNAUTHORIZED` فوراً بدلاً من السماح بالاتصال.

### 3. التحقق من رفع الملفات على S3 (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: يحتوي ملف [s3.ts](src/lib/storage/s3.ts) على قائمة محظورات صارمة للـ MIME types (`BLOCKED_MIME_TYPES`) والتحقق من الامتدادات المسموح بها مع حد أقصى لحجم الملف وهو 50 ميجابايت لمنع رفع الملفات الضارة أو هجمات الـ XSS عبر الـ SVG.

### 4. حماية عملية التسجيل من ثغرات السباق (TOCTOU) (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: عملية التسجيل وإنشاء المنظمات والتحقق من توفر الـ Slug تتم بالكامل داخل معاملة برمجية موحدة (`$transaction`) في قاعدة البيانات مع تطبيق محاولات الإعادة (Retry logic) للقضاء على ثغرات الـ TOCTOU.

### 5. منع تسريب البيانات في لوحة التحكم (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: يتم تصفية جميع استعلامات قاعدة البيانات للوحة التحكم والـ APIs باستخدام الدالة الموحدة `orgFilter()` والتي تعيد قيمة Sentinel ثابتة (`__DENIED__`) في حال عدم انتماء المستخدم لمنظمة، مما يمنع جلب بيانات غير مصرح بها تماماً.

### 6. إنهاء الجلسات وإلغاء الـ Refresh Tokens (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: دالة الـ `logout()` في الـ [auth-service.ts](src/lib/auth/auth-service.ts) تقوم بتحديث حالة كافة الـ Refresh Tokens للمستخدم وإبطالها بالكامل في قاعدة البيانات، مع تسجيل الحدث في سجل التدقيق الأمني الفعلي.

### 7. تكامل ترويسات CSP مع معرفات فريدة Nonce (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: تم ربط ترويسات `Content-Security-Policy` مع معرفات فريدة ديناميكية (nonce) تم توليدها لكل طلب وتمريرها عبر الـ Middleware في [auth-proxy.ts](src/auth-proxy.ts). يتيح ذلك لـ Next.js App Router إدراج الـ nonce تلقائياً في جميع وسوم الـ `<script>` المضمنة و webpack و hydration scripts، مما يمنع ثغرات الـ XSS بشكل كامل دون تعطيل واجهات التطبيق التفاعلية.

### 8. آلية إيقاف التشغيل الآمن (Graceful Shutdown) (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: تم توحيد إنهاء العمليات وتصريف الاتصالات عبر سجل مركزي لإيقاف التشغيل في `src/lib/shutdown.ts`. عند استلام إشارات الإيقاف (SIGTERM/SIGINT)، يتم إغلاق سيرفرات الـ WebSockets، وتصريف قوائم BullMQ، وإغلاق اتصالات Prisma و Redis بشكل آمن لمنع فقدان البيانات أو بقاء طلبات معلقة.

### 9. التوسع في مراقبة حيوية التطبيق (Health Monitoring) (تم التحقق ✅)
* **الحالة**: **مكتملة ومؤمنة.**
* **التفاصيل**: تم توسيع مسارات مراقبة الحيوية في `/api/health` لتفحص الاتصال بقاعدة البيانات، و Redis، والتحقق من حالة طوابير BullMQ الخلفية وموارد السيرفر. يُمكن هذا النظام أنظمة الأوركسترا (مثل Kubernetes أو Docker Swarm) من مراقبة صحة الخدمة بدقة واتخاذ قرارات إعادة التشغيل تلقائياً في حال حدوث خلل.

---

## 🚪 نظام التسجيل والدعوات (Registration & Invitations)
* **التسجيل الذاتي (Self-Registration):** مغلق بالكامل من الواجهة الأمامية (Frontend) لدواعي الأمان.
* **الدعوات (Invitations):** إضافة مستخدمين جدد تتم حصرياً عبر مديري المنظمات بإرسال دعوات بريدية أو عبر توثيق الحسابات مع Google / Microsoft الموثقة للمؤسسة.
* **إزالة الكود الميت:** تم تنظيف المتجر `auth-store.ts` بالكامل وإزالة دالة `register` وواجهات البيانات غير المستخدمة لمنع الفوضى البرمجية.

---

## 📊 الخلاصة الأمنية
البنية الأمنية الحالية للمشروع قوية جداً وتلبي المعايير المؤسسية (Enterprise-grade). تم حل جميع الثغرات الحرجة والمرتفعة، والكود الحالي خالٍ تماماً من أخطاء الـ Type checks ويبني بنجاح تام للإنتاج.
