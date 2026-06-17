# 🔵 BluePrint ERP — خريطة العمل المتبقي
## تاريخ آخر تحديث: 2026-06-14

---

## ✅ الإصلاحات المكتملة

| # | الإصلاح | الأولوية | الحالة |
|---|---------|---------|--------|
| 1 | إزالة كلمات المرور من README | 🔴 حرج | ✅ مكتمل |
| 2 | نقل JWT secret لمتغير بيئة | 🔴 حرج | ✅ مكتمل |
| 3 | إزالة deprecated auth functions | 🟠 كبير | ✅ مكتمل |
| 4 | توحيد rate limiting | 🟠 كبير | ✅ مكتمل |
| 5 | رفع test coverage لـ 70% | 🟠 كبير | ✅ مكتمل |
| 6 | تحويل Dashboard لـ file-based routing | 🟡 متوسط | ✅ بنية أساسية |
| 7 | تنظيف TODO/FIXME | 🟡 متوسط | ✅ مكتمل |

---

## 🔴 عمل حرج متبقي

### C1. CSRF Token SameSite=Strict
- **الملف**: `src/auth-proxy.ts:329-336`
- **المشكلة**: `csrf_token` cookie يستعمل `SameSite=Lax` بدل `Strict`
- **الحل المطلوب**: غيّر لـ `SameSite=Strict` لمنع CSRF attacks عبر المواقع
- **التأثير**: قد يؤثر على الروابط القادمة من مواقع خارجية (trade-off)

### C2. Race condition في التسجيل (TOCTOU)
- **الملف**: `src/app/api/auth/register/route.ts:239-286`
- **المشكلة**: فحص slug collision يحدث خارج transaction
- **الحل المطلوب**: حوّل الفحص لـ `$transaction` مع retry logic

### C3. SQLite Foreign Key Enforcement
- **الملف**: `src/lib/db.ts:38-43`
- **المشكلة**: `PRAGMA foreign_keys = ON` يعمل بشكل async بدون await
- **الحل المطلوب**: أضف `await` أو نفذه في Prisma middleware

---

## 🟠 عمل كبير متبقي

### M1. File-based Routing — تفعيل تدريجي
- **الحالة**: البنية الأساسية مكتملة (60+ صفحة + layout + nav store)
- **المتبقي**:
  1. اختبر التطبيق مع `NEXT_PUBLIC_FILE_ROUTING=true`
  2. حدّث الروابط الداخلية في المكونات (حوالي 170+ ملف)
  3. حدّث `app-sidebar.tsx` ليستعمل `<Link>` بدل `setCurrentPage()`
  4. اختبر browser back/forward
  5. اختبر deep linking
  6. غيّر القيمة الافتراضية لـ `NEXT_PUBLIC_FILE_ROUTING` لـ `true`

### M2. استراتيجية Migration لـ SQLite→PostgreSQL
- **المشكلة**: Schemas منفصلة (`schema.prisma` vs `schema.postgresql.prisma`)
- **الحل المطلوب**:
  1. وحّد الـ schema في ملف واحد مع provider ديناميكي
  2. أضف migration guide من SQLite لـ PostgreSQL
  3. اختبر التبديل بين القواعدين

### M3. Session Polling Optimization
- **الملف**: `src/store/auth-store.ts:152-154`
- **المشكلة**: يصيفي كل 4 دقائق بلا سبب
- **الحل المطلوب**: غيّر لـ activity-based (عند تفاعل المستخدم) أو visibility-based

### M4. Inline Script في Layout بدون CSP Nonce
- **الملف**: `src/app/layout.tsx:70-76`
- **المشكلة**: `dangerouslySetInnerHTML` بدون `nonce` attribute
- **الحل المطلوب**: أضف nonce attribute أو حوّل لـ external script

---

## 🟡 عمل متوسط متبقي

### m1. توحيد رسائل الخطأ (i18n)
- بعض الأخطاء بالعربية، بعضها بالإنجليزية
- الحل: استعمل i18n keys بشكل موحد

### m2. Repository Pattern — توحيد أو إزالة
- `BaseRepository<T>` موجود لكن ما مخدمش بزاف
- الحل: إما وسّع الاستعمال في كل API routes أو أزيلو

### m3. `@ts-expect-error` على Stripe API Version
- **الملف**: `src/lib/stripe.ts:45`
- الحل: تابع تحديث الـ types مع Stripe SDK

### m4. محدوديات رفع الملفات
- Storage abstraction موجود لكن size limits مش متسقة
- الحل: أضف `MAX_FILE_SIZE` config وألزمو في كل upload routes

---

## 📊 تقييم التحسن

| المجال | قبل الإصلاح | بعد الإصلاح | الملاحظة |
|--------|-------------|-------------|---------|
| الأمان | 8.5/10 | 9.0/10 | JWT secret آمن، deprecated functions معطلة |
| تنظيم الكود | 6.5/10 | 7.5/10 | Rate limiting موحد، auth أنظف |
| الاختبارات | 4/10 | 6/10 | Coverage thresholds مرتفعة، اختبارات جديدة |
| الواجهة الأمامية | 6/10 | 7.0/10 | بنية file-based routing جاهزة |
| الصيانة | 6/10 | 7.5/10 | TODO/FIXME نظيف، code أوضح |

---

## 🎯 أولويات المرحلة القادمة

1. 🔴 **فعّل file-based routing** واختبرو بشكل كامل
2. 🔴 **أصلح CSRF SameSite** لـ Strict
3. 🟠 **وحّد Prisma schema** بين SQLite و PostgreSQL
4. 🟠 **زود اختبارات التكامل** للـ auth و multi-tenancy
5. 🟡 **وحّد رسائل الخطأ** عبر i18n
